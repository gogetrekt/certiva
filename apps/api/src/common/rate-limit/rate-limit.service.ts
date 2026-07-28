import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Request } from 'express';

import { AppConfigService } from '../../config/app-config.service';
import {
  RATE_LIMIT_RULE,
  type RateLimitRuleName,
} from './rate-limit.constants';
import { RateLimitMemoryStore } from './rate-limit-memory.store';
import { RateLimitRedisStore } from './rate-limit-redis.store';
import { resolveClientIp } from '../http/resolve-client-ip';
import type {
  RateLimitConfig,
  RateLimitConsumeResult,
  RateLimitRuleConfig,
  RateLimitStoreResult,
} from './rate-limit.types';

const REDIS_FALLBACK_COOLDOWN_MS = 30_000;

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly config: RateLimitConfig;
  private readonly rules: Record<RateLimitRuleName, RateLimitRuleConfig>;
  private readonly trustProxy: boolean;
  private redisFallbackUntil = 0;

  constructor(
    configService: AppConfigService,
    private readonly redisStore: RateLimitRedisStore,
    private readonly memoryStore: RateLimitMemoryStore,
  ) {
    this.config = configService.rateLimit;
    this.trustProxy = configService.trustProxy;
    this.rules = {
      [RATE_LIMIT_RULE.AUTH_LOGIN]: {
        ...this.config.authLogin,
        message: 'Too many login attempts. Please try again later.',
      },
      [RATE_LIMIT_RULE.VERIFICATION]: {
        ...this.config.verification,
        message: 'Rate limit exceeded. Please try again later.',
      },
      [RATE_LIMIT_RULE.VERIFICATION_UPLOAD]: {
        ...this.config.verificationUpload,
        message: 'Too many verification uploads. Please try again later.',
      },
      [RATE_LIMIT_RULE.ADMIN]: {
        ...this.config.admin,
        message: 'Rate limit exceeded. Please try again later.',
      },
    };
  }

  async consume(
    ruleName: RateLimitRuleName,
    request: Request,
  ): Promise<RateLimitConsumeResult> {
    const rule = this.rules[ruleName];
    const key = this.buildKey(ruleName, this.resolveClientIp(request));
    const result = await this.consumeFromStore(ruleName, key, rule);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
    );

    return {
      ...result,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - result.totalHits),
      retryAfterSeconds,
      message: rule.message,
    };
  }

  private async consumeFromStore(
    ruleName: RateLimitRuleName,
    key: string,
    rule: RateLimitRuleConfig,
  ): Promise<RateLimitStoreResult> {
    if (this.config.store === 'memory') {
      return this.memoryStore.consume(key, rule.limit, rule.windowSeconds);
    }

    // The in-memory store starts every key at zero, so falling back to it
    // hands whoever was near the limit a fresh quota. For public verification
    // that is the right trade — it must not die with Redis. For login it is a
    // brute-force shortcut: a flapping Redis would reset the attacker's counter
    // every cooldown window. So AUTH_LOGIN never touches the memory store, and
    // therefore never uses the cooldown either.
    const canFailOpen = ruleName !== RATE_LIMIT_RULE.AUTH_LOGIN;

    if (canFailOpen && Date.now() < this.redisFallbackUntil) {
      return this.memoryStore.consume(key, rule.limit, rule.windowSeconds);
    }

    try {
      return await this.redisStore.consume(key, rule.limit, rule.windowSeconds);
    } catch (error) {
      if (!canFailOpen) {
        this.logger.error(
          `Rate limiter Redis store unavailable; refusing ${ruleName} requests instead of counting them in memory.`,
        );
        if (error instanceof Error) {
          this.logger.debug(error.message);
        }

        return {
          allowed: false,
          totalHits: rule.limit + 1,
          resetAt: new Date(Date.now() + rule.windowSeconds * 1000),
        };
      }

      this.redisFallbackUntil = Date.now() + REDIS_FALLBACK_COOLDOWN_MS;
      this.logger.warn(
        `Rate limiter Redis store unavailable; using in-memory fallback for ${REDIS_FALLBACK_COOLDOWN_MS / 1000} seconds.`,
      );
      if (error instanceof Error) {
        this.logger.debug(error.message);
      }

      return this.memoryStore.consume(key, rule.limit, rule.windowSeconds);
    }
  }

  private buildKey(ruleName: RateLimitRuleName, clientIp: string) {
    const ipHash = createHash('sha256').update(clientIp).digest('hex');
    return `${this.config.redisPrefix}:${ruleName}:${ipHash}`;
  }

  private resolveClientIp(request: Request) {
    return resolveClientIp(request, this.trustProxy);
  }
}
