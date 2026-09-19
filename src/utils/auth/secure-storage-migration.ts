import {
  SENSITIVE_STORAGE_KEYS,
  isSensitiveStorageKey,
  readString,
  type StorageLike,
  type LegacyStoreLike,
  type SecureStorageBackend,
} from "./secure-storage-types.js";

/**
 * Loads secure values and migrates legacy native/store copies. Secure writes
 * complete before any plaintext copy is deleted, so a failed migration keeps
 * the legacy copy recoverable.
 */
export async function migrateLegacySensitiveValues(
  backend: SecureStorageBackend,
  store: LegacyStoreLike,
  nativeStorage: StorageLike,
  decryptedLegacyValues: Record<string, string> = {},
): Promise<Map<string, string>> {
  const secureValues = await backend.load();
  if (!secureValues || typeof secureValues !== "object" || Array.isArray(secureValues)) {
    throw new Error("Secure storage returned an invalid value map");
  }

  const storeKeys = await store.keys();
  const nativeKeys: string[] = [];
  for (let index = 0; index < nativeStorage.length; index += 1) {
    const key = nativeStorage.key(index);
    if (key !== null) nativeKeys.push(key);
  }
  const sensitiveKeys = new Set<string>([
    ...SENSITIVE_STORAGE_KEYS,
    ...Object.keys(secureValues).filter(isSensitiveStorageKey),
    ...storeKeys.filter(isSensitiveStorageKey),
    ...nativeKeys.filter(isSensitiveStorageKey),
    ...Object.keys(decryptedLegacyValues).filter(isSensitiveStorageKey),
  ]);
  const legacyStoreValues = new Map<string, string>();
  const legacyNativeValues = new Map<string, string>();
  for (const key of sensitiveKeys) {
    const storeValue = readString(await store.get<unknown>(key));
    if (storeKeys.includes(key) && storeValue !== undefined) {
      legacyStoreValues.set(key, storeValue);
    }

    const nativeValue = nativeStorage.getItem(key);
    if (nativeValue !== null) legacyNativeValues.set(key, nativeValue);
  }

  const migratedValues = new Map<string, string>();
  for (const key of sensitiveKeys) {
    const secureValue = readString(secureValues[key]);
    if (secureValue !== undefined) {
      migratedValues.set(key, secureValue);
      continue;
    }

    const legacyValue =
      decryptedLegacyValues[key] ?? legacyStoreValues.get(key) ?? legacyNativeValues.get(key);
    if (legacyValue === undefined) continue;

    // Do not delete either legacy copy until every secure write succeeds.
    await backend.set(key, legacyValue);
    migratedValues.set(key, legacyValue);
  }

  let changedStore = false;
  for (const key of sensitiveKeys) {
    if (!migratedValues.has(key)) continue;
    if (legacyStoreValues.has(key)) {
      await store.delete(key);
      changedStore = true;
    }
  }
  if (changedStore) await store.save();

  for (const key of sensitiveKeys) {
    if (migratedValues.has(key) && legacyNativeValues.has(key)) {
      nativeStorage.removeItem(key);
    }
  }

  return migratedValues;
}
