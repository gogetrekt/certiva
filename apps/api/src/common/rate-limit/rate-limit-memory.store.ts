import { Injectable } from '@nestjs/common';

import type { RateLimitStore, RateLimitStoreResult } from './rate-limit.types';

@Injectable()
export class RateLimitMemoryStore implements RateLimitStore {
  private readonly buckets = new Map<string, number[]>();

  consume(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitStoreResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;
    const hits = (this.buckets.get(key) ?? []).filter(
      (timestamp) => timestamp > windowStart,
    );

    if (hits.length >= limit) {
      this.buckets.set(key, hits);
      return Promise.resolve({
        allowed: false,
        totalHits: hits.length,
        resetAt: new Date((hits[0] ?? now) + windowMs),
      });
    }

    hits.push(now);
    this.buckets.set(key, hits);

    return Promise.resolve({
      allowed: true,
      totalHits: hits.length,
      resetAt: new Date((hits[0] ?? now) + windowMs),
    });
  }
}
