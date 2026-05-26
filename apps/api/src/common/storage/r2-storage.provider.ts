import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Logger } from "@nestjs/common";
import { Readable } from "node:stream";

import type { StorageProvider } from "./storage.interface";

export interface R2StorageConfig {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  forcePathStyle?: boolean;
}

export class R2StorageProvider implements StorageProvider {
  private readonly logger = new Logger(R2StorageProvider.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: R2StorageConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle ?? true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async put(key: string, data: Buffer | string, contentType?: string): Promise<void> {
    const body = typeof data === "string" ? Buffer.from(data, "utf8") : data;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType ?? "application/octet-stream",
        ContentLength: body.byteLength,
      }),
    );
    this.logger.debug(`R2 put: ${key} (${body.byteLength} bytes)`);
  }

  async get(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!response.Body) {
      throw new Error(`R2 object body is empty: ${key}`);
    }
    return this.streamToBuffer(response.Body as Readable);
  }

  async getText(key: string): Promise<string> {
    const buf = await this.get(key);
    return buf.toString("utf8");
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (err: unknown) {
      const code = (err as { name?: string; $metadata?: { httpStatusCode?: number } });
      if (
        code?.name === "NotFound" ||
        code?.name === "NoSuchKey" ||
        code?.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch {
      // R2 delete is idempotent; ignore if already absent
    }
    this.logger.debug(`R2 deleted: ${key}`);
  }

  async deletePrefix(prefix: string): Promise<void> {
    const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
    let continuationToken: string | undefined;

    do {
      const listResult = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: normalizedPrefix,
          ContinuationToken: continuationToken,
        }),
      );

      const keys = (listResult.Contents ?? []).map((obj) => obj.Key).filter(Boolean) as string[];
      for (const key of keys) {
        await this.delete(key);
      }

      continuationToken = listResult.IsTruncated ? listResult.NextContinuationToken : undefined;
    } while (continuationToken);

    this.logger.debug(`R2 deleted prefix: ${normalizedPrefix}`);
  }

  private streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
  }
}
