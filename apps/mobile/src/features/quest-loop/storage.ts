import { readJson, storageKeys, writeJson } from '../../lib/appStorage';

/**
 * A verified scan awaiting completion, kept so an interrupted completion
 * survives an app restart. It is NOT proof of anything on its own: the server
 * re-validates the scan (owner, age, single use) inside complete_quest.
 */
export interface PendingScan {
  userId: string;
  questId: string;
  scanId: string;
  /** ms epoch when the server recorded the scan. */
  scannedAt: number;
  instanceId?: string | null;
}

/** complete_quest rejects scans older than 2 hours (0018). */
export const SCAN_TTL_MS = 2 * 60 * 60 * 1000;

function isPendingScan(v: unknown): v is PendingScan {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.userId === 'string' &&
    typeof s.questId === 'string' &&
    typeof s.scanId === 'string' &&
    s.scanId.length > 0 &&
    typeof s.scannedAt === 'number' &&
    (s.instanceId == null || typeof s.instanceId === 'string')
  );
}

/** Drops malformed, expired and other-user entries. */
export function pruneScans(raw: unknown, userId: string, now = Date.now()): PendingScan[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isPendingScan)
    .filter((s) => s.userId === userId && now - s.scannedAt <= SCAN_TTL_MS && s.scannedAt <= now + 5 * 60_000);
}

async function readAll(userId: string): Promise<PendingScan[]> {
  return pruneScans(await readJson<unknown>(storageKeys.questLoop), userId);
}

export async function loadPendingScan(userId: string, questId: string): Promise<PendingScan | null> {
  const all = await readAll(userId);
  return all.find((s) => s.questId === questId) ?? null;
}

/** Persistence is best effort: a storage failure must not block the in-memory flow. */
export async function savePendingScan(scan: PendingScan): Promise<void> {
  try {
    const others = (await readAll(scan.userId)).filter((s) => s.questId !== scan.questId);
    await writeJson(storageKeys.questLoop, [...others, scan]);
  } catch {
    /* ignore */
  }
}

export async function clearPendingScan(userId: string, questId: string): Promise<void> {
  try {
    const others = (await readAll(userId)).filter((s) => s.questId !== questId);
    await writeJson(storageKeys.questLoop, others);
  } catch {
    /* ignore */
  }
}

function randomId() {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Random id sent with scans (record_code_scan). Not account data, not a secret. */
export async function getAnonymousSessionId(): Promise<string> {
  try {
    const existing = await readJson<string>(storageKeys.anonymousSessionId);
    if (typeof existing === 'string' && existing.length > 0) return existing;
    const id = randomId();
    await writeJson(storageKeys.anonymousSessionId, id);
    return id;
  } catch {
    return randomId();
  }
}
