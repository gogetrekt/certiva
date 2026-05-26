import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { R2StorageConfig } from '../common/storage/r2-storage.provider';
import type { RateLimitConfig } from '../common/rate-limit/rate-limit.types';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get port() {
    return this.configService.get<number>('app.port', 4000);
  }

  get nodeEnv() {
    return this.configService.get<string>('app.nodeEnv', 'development');
  }

  get appEnv() {
    return this.configService.get<string>('app.appEnv', 'development');
  }

  get isExposedEnv() {
    return (
      this.nodeEnv === 'production' ||
      this.appEnv === 'staging' ||
      this.appEnv === 'production'
    );
  }

  get databaseUrl() {
    return this.configService.getOrThrow<string>('database.url');
  }

  get redisUrl() {
    return this.configService.getOrThrow<string>('redis.url');
  }

  get rateLimit() {
    return this.configService.getOrThrow<RateLimitConfig>('rateLimit');
  }

  get jwtSecret() {
    return this.configService.getOrThrow<string>('auth.jwtSecret');
  }

  get jwtExpiresIn() {
    return this.configService.get<string>('auth.jwtExpiresIn', '12h');
  }

  /**
   * Returns the list of allowed CORS origins.
   * In staging/production, never falls back to allow-all (true).
   * In local development with no origins configured, returns allow-all as a convenience.
   */
  get corsOrigins(): string[] | true {
    const raw = this.configService.get<string>('app.corsOrigins', '');
    const origins = raw
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    if (origins.length === 0) {
      if (this.isExposedEnv) {
        // validateEnv already rejects this state, but guard here too
        throw new Error(
          'CORS_ORIGINS must not be empty in staging or production. ' +
          'Set CORS_ORIGINS to a comma-separated list of allowed origins.',
        );
      }
      // Local dev convenience: allow all (bracket widened only in dev)
      return true;
    }

    return origins;
  }

  get cookieSecure() {
    return this.configService.get<boolean>('app.cookieSecure', false);
  }

  get trustProxy() {
    return this.configService.get<boolean>('app.trustProxy', false);
  }

  get apiPublicBaseUrl() {
    return this.configService.get<string>(
      'app.apiPublicBaseUrl',
      'http://127.0.0.1:4000/api',
    );
  }

  get webPublicBaseUrl() {
    return this.configService.get<string>(
      'app.webPublicBaseUrl',
      'http://127.0.0.1:3000',
    );
  }

  get assetStorageRoot() {
    return this.configService.get<string>('app.assetStorageRoot', 'storage');
  }

  get storageDriver(): 'local' | 'r2' {
    return this.configService.get<'local' | 'r2'>('app.storageDriver', 'local');
  }

  get r2Config(): R2StorageConfig {
    return {
      accountId: this.configService.get<string>('r2.accountId', ''),
      bucket: this.configService.get<string>('r2.bucket', ''),
      accessKeyId: this.configService.get<string>('r2.accessKeyId', ''),
      secretAccessKey: this.configService.get<string>('r2.secretAccessKey', ''),
      endpoint: this.configService.get<string>('r2.endpoint', ''),
      forcePathStyle: this.configService.get<boolean>('r2.forcePathStyle', true),
    };
  }

  get r2PublicBaseUrl(): string {
    return this.configService.get<string>('r2.publicBaseUrl', '');
  }

  get blockchainRpcUrl() {
    return this.configService.get<string | null>(
      'blockchain.polygonAmoyRpcUrl',
      null,
    );
  }

  get blockchainPrivateKey() {
    return this.configService.get<string | null>('blockchain.privateKey', null);
  }

  get blockchainContractAddress() {
    return this.configService.get<string | null>(
      'blockchain.contractAddress',
      null,
    );
  }

  get blockchainRpcTimeoutMs() {
    return this.configService.get<number>('blockchain.rpcTimeoutMs', 12000);
  }
}
