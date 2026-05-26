import { Logger } from "@nestjs/common";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";

import type { StorageProvider } from "./storage.interface";

export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly root: string;

  constructor(assetStorageRoot: string) {
    this.root = isAbsolute(assetStorageRoot)
      ? assetStorageRoot
      : resolve(process.cwd(), assetStorageRoot);
  }

  private fullPath(key: string) {
    return join(this.root, key);
  }

  async put(key: string, data: Buffer | string): Promise<void> {
    const fp = this.fullPath(key);
    await mkdir(dirname(fp), { recursive: true });
    await writeFile(fp, data);
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.fullPath(key));
  }

  async getText(key: string): Promise<string> {
    return readFile(this.fullPath(key), "utf8");
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.fullPath(key));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await rm(this.fullPath(key), { force: true });
    } catch {
      // already absent
    }
  }

  async deletePrefix(prefix: string): Promise<void> {
    const fp = join(this.root, prefix);
    try {
      await rm(fp, { recursive: true, force: true });
    } catch {
      // already absent
    }
    this.logger.debug(`Deleted local prefix: ${prefix}`);
  }

  /** Expose root for migration tooling only. */
  getRoot(): string {
    return this.root;
  }
}
