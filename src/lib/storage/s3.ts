import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import config from "@/lib/config";
import { logger } from "@/lib/logger";

/**
 * S3-compatible storage wrapper (works with AWS S3, Cloudflare R2, MinIO).
 *
 * All operations are async and include basic error handling.
 */
export class S3Storage {
  private client: S3Client;
  private bucket: string;
  private publicUrlBase: string;

  constructor() {
    this.bucket = config.storage.bucket;
    this.publicUrlBase = config.storage.publicUrl;

    this.client = new S3Client({
      endpoint: config.storage.endpoint || undefined,
      region: config.storage.region,
      credentials: {
        accessKeyId: config.storage.accessKey,
        secretAccessKey: config.storage.secretKey,
      },
      forcePathStyle: true, // Required for MinIO / R2.
    });
  }

  /**
   * Upload a file to S3-compatible storage.
   *
   * @param key      - Object key (path).
   * @param body     - File contents as a Buffer, Uint8Array, or string.
   * @param mimeType - MIME type of the file.
   */
  async upload(
    key: string,
    body: Buffer | Uint8Array | string,
    mimeType: string,
  ): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: mimeType,
        }),
      );
      logger.debug("S3 upload succeeded", { key, bucket: this.bucket });
    } catch (err) {
      logger.error({ err, key }, "S3 upload failed");
      throw new StorageError(`Failed to upload ${key}`, "UPLOAD_FAILED");
    }
  }

  /**
   * Generate a presigned GET URL for temporary access to a private object.
   *
   * @param key       - Object key.
   * @param expiresIn - Seconds until the URL expires (default 3600).
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const url = await getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
        { expiresIn },
      );
      return url;
    } catch (err) {
      logger.error({ err, key }, "Failed to generate signed URL");
      throw new StorageError(
        `Failed to generate signed URL for ${key}`,
        "SIGNED_URL_FAILED",
      );
    }
  }

  /**
   * Delete an object from storage.
   *
   * @param key - Object key to delete.
   */
  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      logger.debug("S3 delete succeeded", { key });
    } catch (err) {
      logger.error({ err, key }, "S3 delete failed");
      throw new StorageError(`Failed to delete ${key}`, "DELETE_FAILED");
    }
  }

  /**
   * List objects with a given prefix.
   *
   * @param prefix - The key prefix to filter by.
   * @returns Array of object keys.
   */
  async list(prefix: string): Promise<string[]> {
    try {
      const result = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
        }),
      );
      return (result.Contents ?? []).map((o) => o.Key!).filter(Boolean);
    } catch (err) {
      logger.error({ err, prefix }, "S3 list failed");
      throw new StorageError(
        `Failed to list objects under ${prefix}`,
        "LIST_FAILED",
      );
    }
  }
}

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "StorageError";
  }
}

// Singleton.
export const storage = new S3Storage();
