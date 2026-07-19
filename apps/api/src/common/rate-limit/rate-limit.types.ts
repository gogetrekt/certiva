export interface RateLimitWindowConfig {
  limit: number;
  windowSeconds: number;
}

export interface RateLimitConfig {
  store: 'redis' | 'memory';
  redisPrefix: string;
  authLogin: RateLimitWindowConfig;
  verification: RateLimitWindowConfig;
  verificationUpload: RateLimitWindowConfig;
  admin: RateLimitWindowConfig;
}

export interface RateLimitRuleConfig extends RateLimitWindowConfig {
  message: string;
}

export interface RateLimitStoreResult {
  allowed: boolean;
  totalHits: number;
  resetAt: Date;
}

export interface RateLimitConsumeResult extends RateLimitStoreResult {
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  message: string;
}

export interface RateLimitStore {
  consume(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitStoreResult>;
}
