import * as fs from "node:fs/promises";
import * as path from "node:path";
import { logger } from "@/lib/logger";

/**
 * LocalStorage — writes evidence files to a local directory.
 *
 * Used as a development fallback when S3 is not configured.
 * Files are stored under <root>/.marten/investigations/<investigationId>/.
 */
export class LocalStorage {
  private baseDir: string;

  constructor(baseDir?: string) {
    // Default to <project root>/.marten
    this.baseDir = baseDir ?? path.join(process.cwd(), ".marten", "investigations");
  }

  async upload(
    key: string,
    body: Buffer | Uint8Array | string,
    _mimeType: string,
  ): Promise<void> {
    const filePath = this.#resolvePath(key);

    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, body);
      logger.debug("Local storage write succeeded", { key, filePath });
    } catch (err) {
      logger.error({ err, key, filePath }, "Local storage write failed");
      throw new StorageError(`Failed to write ${key} locally`, "UPLOAD_FAILED");
    }
  }

  async getSignedUrl(key: string, _expiresIn = 3600): Promise<string> {
    // In local mode, return a file:// URL for dev access.
    const filePath = this.#resolvePath(key);
    return `file://${filePath}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = this.#resolvePath(key);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      logger.error({ err, key, filePath }, "Local storage delete failed");
      throw new StorageError(`Failed to delete ${key} locally`, "DELETE_FAILED");
    }
  }

  async list(prefix: string): Promise<string[]> {
    const dirPath = this.#resolvePath(prefix);
    try {
      const entries = await fs.readdir(dirPath, { recursive: true });
      return entries.map((e) => path.join(prefix, e));
    } catch {
      // Directory may not exist yet.
      return [];
    }
  }

  #resolvePath(key: string): string {
    // Strip leading "investigations/" if present, then resolve
    const relativePath = key.replace(/^investigations\//, "");
    return path.join(this.baseDir, relativePath);
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
