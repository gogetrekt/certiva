import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { RateLimitConfig } from '../common/rate-limit/rate-limit.types';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get port() {
    return this.configService.get<number>('app.port', 4000);
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

  get corsOrigins() {
    const rawOrigins = this.configService.get<string>('app.corsOrigin', '');
    if (!rawOrigins) {
      return true;
    }

    return rawOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
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
