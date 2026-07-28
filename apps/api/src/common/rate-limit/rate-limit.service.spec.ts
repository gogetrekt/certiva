import type { Request } from 'express';

import type { AppConfigService } from '../../config/app-config.service';
import { RATE_LIMIT_RULE } from './rate-limit.constants';
import { RateLimitMemoryStore } from './rate-limit-memory.store';
import type { RateLimitRedisStore } from './rate-limit-redis.store';
import { RateLimitService } from './rate-limit.service';

/**
 * Locks the Redis-outage behaviour. The in-memory fallback starts every key at
 * zero, so failing open into it gives a caller that was one attempt from the
 * limit a fresh quota. For public verification that is the correct trade; for
 * login it is a brute-force shortcut, so AUTH_LOGIN fails closed instead and
 * never reaches the memory store.
 */
describe('RateLimitService — Redis outage', () => {
  const request = { headers: {}, ip: '203.0.113.7' } as unknown as Request;

  const build = (consume: jest.Mock) => {
    const memoryStore = new RateLimitMemoryStore();
    const memorySpy = jest.spyOn(memoryStore, 'consume');
    const service = new RateLimitService(
      {
        trustProxy: false,
        rateLimit: {
          store: 'redis',
          redisPrefix: 'test',
          authLogin: { limit: 5, windowSeconds: 900 },
          verification: { limit: 60, windowSeconds: 60 },
          verificationUpload: { limit: 10, windowSeconds: 60 },
          admin: { limit: 120, windowSeconds: 60 },
        },
      } as unknown as AppConfigService,
      { consume } as unknown as RateLimitRedisStore,
      memoryStore,
    );

    return { service, memorySpy };
  };

  const failingRedis = () =>
    jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

  it('refuses AUTH_LOGIN instead of falling back to memory', async () => {
    const { service, memorySpy } = build(failingRedis());

    const result = await service.consume(RATE_LIMIT_RULE.AUTH_LOGIN, request);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(memorySpy).not.toHaveBeenCalled();
  });

  it('keeps public verification alive through the memory store', async () => {
    const { service, memorySpy } = build(failingRedis());

    const result = await service.consume(RATE_LIMIT_RULE.VERIFICATION, request);

    expect(result.allowed).toBe(true);
    expect(memorySpy).toHaveBeenCalledTimes(1);
  });

  it('does not let the fail-open cooldown pull AUTH_LOGIN into memory', async () => {
    // A verification request trips the 30s cooldown first. AUTH_LOGIN must
    // still go to Redis (and still be refused) rather than ride the cooldown
    // into a zeroed in-memory counter.
    const consume = failingRedis();
    const { service, memorySpy } = build(consume);

    await service.consume(RATE_LIMIT_RULE.VERIFICATION, request);
    memorySpy.mockClear();

    const result = await service.consume(RATE_LIMIT_RULE.AUTH_LOGIN, request);

    expect(result.allowed).toBe(false);
    expect(memorySpy).not.toHaveBeenCalled();
    expect(consume).toHaveBeenCalledTimes(2);
  });

  it('still counts AUTH_LOGIN in Redis when Redis is healthy', async () => {
    // Guards against fixing the outage path by refusing logins outright.
    const consume = jest.fn().mockResolvedValue({
      allowed: true,
      totalHits: 1,
      resetAt: new Date(Date.now() + 900_000),
    });
    const { service, memorySpy } = build(consume);

    const result = await service.consume(RATE_LIMIT_RULE.AUTH_LOGIN, request);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(memorySpy).not.toHaveBeenCalled();
  });
});
