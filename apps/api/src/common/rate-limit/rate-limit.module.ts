import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AppConfigModule } from '../../config/app-config.module';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitMemoryStore } from './rate-limit-memory.store';
import { RateLimitRedisStore } from './rate-limit-redis.store';
import { RateLimitService } from './rate-limit.service';

@Module({
  imports: [AppConfigModule],
  providers: [
    RateLimitService,
    RateLimitRedisStore,
    RateLimitMemoryStore,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
  exports: [RateLimitService],
})
export class RateLimitModule {}
