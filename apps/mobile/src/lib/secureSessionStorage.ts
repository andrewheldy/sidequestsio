import * as SecureStore from 'expo-secure-store';

/**
 * Supabase auth storage backed by the iOS Keychain / Android Keystore.
 *
 * SecureStore values should stay under ~2 KB, and a Supabase session can be
 * larger, so each value is split into chunks under `<key>.<n>` with a chunk
 * count at `<key>`. Only the auth client writes here. Passwords are never
 * stored; drafts and other non-secret state use appStorage instead.
 */
const CHUNK_SIZE = 1800;
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

// SecureStore keys allow only [A-Za-z0-9._-].
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

async function readCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(key, OPTIONS);
  const count = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(count) && count > 0 ? count : 0;
}

export const secureSessionStorage = {
  async getItem(rawKey: string): Promise<string | null> {
    const key = safeKey(rawKey);
    const count = await readCount(key);
    if (count === 0) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`, OPTIONS);
      if (part === null) return null; // Partial write: treat as signed out.
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(rawKey: string, value: string): Promise<void> {
    const key = safeKey(rawKey);
    const previous = await readCount(key);
    const count = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
    for (let i = 0; i < count; i += 1) {
      await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE), OPTIONS);
    }
    await SecureStore.setItemAsync(key, String(count), OPTIONS);
    for (let i = count; i < previous; i += 1) {
      await SecureStore.deleteItemAsync(`${key}.${i}`, OPTIONS);
    }
  },

  async removeItem(rawKey: string): Promise<void> {
    const key = safeKey(rawKey);
    const count = await readCount(key);
    await SecureStore.deleteItemAsync(key, OPTIONS);
    for (let i = 0; i < count; i += 1) {
      await SecureStore.deleteItemAsync(`${key}.${i}`, OPTIONS);
    }
  },
};
