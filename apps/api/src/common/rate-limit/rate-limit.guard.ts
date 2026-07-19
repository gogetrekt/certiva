import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';

import {
  RATE_LIMIT_RULE_METADATA,
  type RateLimitRuleName,
} from './rate-limit.constants';
import { RateLimitService } from './rate-limit.service';
import type { RateLimitConsumeResult } from './rate-limit.types';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const ruleName = this.reflector.getAllAndOverride<RateLimitRuleName>(
      RATE_LIMIT_RULE_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (!ruleName) {
      return true;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const result = await this.rateLimitService.consume(ruleName, request);

    this.setHeaders(response, result);

    if (!result.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: result.message,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private setHeaders(response: Response, result: RateLimitConsumeResult) {
    response.setHeader('X-RateLimit-Limit', result.limit.toString());
    response.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    response.setHeader(
      'X-RateLimit-Reset',
      Math.ceil(result.resetAt.getTime() / 1000).toString(),
    );

    if (!result.allowed) {
      response.setHeader('Retry-After', result.retryAfterSeconds.toString());
    }
  }
}
