import config from "@/lib/config";
import { S3Storage } from "./s3";
import { LocalStorage } from "./local";
import type { S3Storage as S3StorageType } from "./s3";

type StorageBackend = S3StorageType | LocalStorage;

/**
 * Select the storage backend based on configuration.
 *
 * - If `STORAGE_PROVIDER=local` or no S3 credentials are set, use
 *   the local filesystem (development default).
 * - Otherwise use S3-compatible storage.
 */
function createStorage(): StorageBackend {
  if (config.storage.provider === "local") {
    return new LocalStorage();
  }

  // If no S3 credentials are configured, fall back to local.
  if (!config.storage.accessKey || !config.storage.secretKey) {
    return new LocalStorage();
  }

  return new S3Storage();
}

export const storage = createStorage();
