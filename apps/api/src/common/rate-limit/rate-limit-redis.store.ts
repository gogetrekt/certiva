import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import IORedis from 'ioredis';

import { AppConfigService } from '../../config/app-config.service';
import type { RateLimitStore, RateLimitStoreResult } from './rate-limit.types';

const RATE_LIMIT_LUA_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
local expireSeconds = tonumber(ARGV[5])

redis.call("ZREMRANGEBYSCORE", key, 0, now - window)
local count = redis.call("ZCARD", key)

if count >= limit then
  local oldest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")
  local resetAt = now + window
  if oldest[2] ~= false and oldest[2] ~= nil then
    resetAt = tonumber(oldest[2]) + window
  end
  redis.call("EXPIRE", key, expireSeconds)
  return {0, count, resetAt}
end

redis.call("ZADD", key, now, member)
count = redis.call("ZCARD", key)
local oldest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")
local resetAt = now + window
if oldest[2] ~= false and oldest[2] ~= nil then
  resetAt = tonumber(oldest[2]) + window
end
redis.call("EXPIRE", key, expireSeconds)

return {1, count, resetAt}
`;

@Injectable()
export class RateLimitRedisStore implements RateLimitStore, OnModuleDestroy {
  private readonly redis: IORedis;

  constructor(configService: AppConfigService) {
    this.redis = new IORedis(configService.redisUrl, {
      connectTimeout: 500,
      enableReadyCheck: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    this.redis.on('error', () => undefined);
  }

  async onModuleDestroy() {
    await this.redis.quit().catch(() => undefined);
  }

  async consume(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitStoreResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const result = await this.redis.eval(
      RATE_LIMIT_LUA_SCRIPT,
      1,
      key,
      now,
      windowMs,
      limit,
      randomUUID(),
      windowSeconds,
    );

    if (!Array.isArray(result) || result.length < 3) {
      throw new Error('Invalid Redis rate-limit response.');
    }

    const [allowed, totalHits, resetAt] = result.map((value) => Number(value));

    return {
      allowed: allowed === 1,
      totalHits,
      resetAt: new Date(resetAt),
    };
  }
}
