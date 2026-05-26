import { Injectable, Logger, OnModuleInit } from "@nestjs/common";

import { AppConfigService } from "../../config/app-config.service";
import { LocalStorageProvider } from "./local-storage.provider";
import { R2StorageProvider } from "./r2-storage.provider";
import type { StorageProvider } from "./storage.interface";

@Injectable()
export class StorageService implements StorageProvider, OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private provider!: StorageProvider;

  constructor(private readonly configService: AppConfigService) {}

  onModuleInit() {
    const driver = this.configService.storageDriver;
    if (driver === "r2") {
      const cfg = this.configService.r2Config;
      this.provider = new R2StorageProvider(cfg);
      this.logger.log("Storage driver: r2");
    } else {
      const root = this.configService.assetStorageRoot;
      this.provider = new LocalStorageProvider(root);
      this.logger.log(`Storage driver: local (root=${root})`);
    }
  }

  put(key: string, data: Buffer | string, contentType?: string): Promise<void> {
    return this.provider.put(key, data, contentType);
  }

  get(key: string): Promise<Buffer> {
    return this.provider.get(key);
  }

  getText(key: string): Promise<string> {
    return this.provider.getText(key);
  }

  exists(key: string): Promise<boolean> {
    return this.provider.exists(key);
  }

  delete(key: string): Promise<void> {
    return this.provider.delete(key);
  }

  deletePrefix(prefix: string): Promise<void> {
    return this.provider.deletePrefix(prefix);
  }

  /** Returns the raw provider for migration tooling. */
  getProvider(): StorageProvider {
    return this.provider;
  }

  isLocal(): boolean {
    return this.provider instanceof LocalStorageProvider;
  }

  isR2(): boolean {
    return this.provider instanceof R2StorageProvider;
  }
}
