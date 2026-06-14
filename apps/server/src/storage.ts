import { createStorageAdapterFromEnv, type StorageAdapter } from "@shared/processor";

let storage: StorageAdapter | undefined;

/**
 * Lazily builds one S3/MinIO adapter from env, mirroring the queue/redis
 * singleton pattern in queue.ts so we don't open a client per request.
 */
export function getStorage(): StorageAdapter {
  if (!storage) {
    storage = createStorageAdapterFromEnv();
  }
  return storage;
}
