import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckError,
  HealthCheckService,
  type HealthIndicatorResult,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import IORedis from 'ioredis';

import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  // Liveness: process is up. No external dependencies touched.
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  // Readiness: 200 only when Postgres and Redis are both reachable.
  // Kept at /api/health so existing infra probes get 200 when healthy.
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaIndicator.pingCheck('database', this.prisma),
      () => this.redisCheck(),
    ]);
  }

  // ponytail: fresh connection per probe — health checks are infrequent, so a
  // pooled/persistent client isn't worth the lifecycle code. Switch to a shared
  // client if probe frequency ever matters.
  private async redisCheck(): Promise<HealthIndicatorResult> {
    const client = new IORedis(this.config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });
    try {
      await client.connect();
      await client.ping();
      return { redis: { status: 'up' } };
    } catch (err) {
      throw new HealthCheckError('Redis check failed', {
        redis: { status: 'down', message: (err as Error).message },
      });
    } finally {
      client.disconnect();
    }
  }
}
