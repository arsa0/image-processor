import { createStorageAdapterFromEnv, type StorageAdapter } from "@shared/processor";

let storage: StorageAdapter | undefined;

export function getStorage(): StorageAdapter {
  storage ??= createStorageAdapterFromEnv();
  return storage;
}
