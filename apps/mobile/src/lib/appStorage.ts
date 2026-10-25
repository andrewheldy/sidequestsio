import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Non-secret local state (drafts, pending navigation). Never put tokens or
 * passwords here: the auth session lives in secureSessionStorage.
 *
 * Every key is registered below so signout/account switching can clear all
 * account-scoped state in one place.
 */
export const storageKeys = {
  /** Validated destination to return to after auth/onboarding (navigation/returnTo). */
  pendingReturn: 'sq.pendingReturn.v1',
  /** Onboarding draft; carries the owning user id (null for a guest). */
  onboardingDraft: 'sq.onboardingDraft.v1',
  /** Random id sent with anonymous scans (record_code_scan). Not account data. */
  anonymousSessionId: 'sq.anonymousSessionId.v1',
  /** Quest-loop state that must survive restarts (e.g. a verified scan awaiting completion). */
  questLoop: 'sq.questLoop.v1',
} as const;

/** Keys holding one user's private state; removed on signout and account switch. */
export const accountScopedKeys: string[] = [storageKeys.onboardingDraft, storageKeys.questLoop];

export async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function clearAccountScopedStorage(): Promise<void> {
  await AsyncStorage.multiRemove([...accountScopedKeys, storageKeys.pendingReturn]);
}
