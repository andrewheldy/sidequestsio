/**
 * localStorage-backed persistence for the LocalRepository.
 *
 * The entire database is a single JSON snapshot. This is intentionally simple:
 * it makes the app fully functional offline/with no backend, and the shape maps
 * 1:1 onto the Postgres tables so porting reads/writes to Supabase is mechanical.
 */

import type {
  AuditLog,
  CommunityNote,
  ConsentEvent,
  Partner,
  PointsLedgerEntry,
  PrivacyPreferences,
  Quest,
  QuestAttempt,
  QuestCompletion,
  QrCode,
  Reward,
  RewardRedemption,
  ScanEvent,
  User,
  UserProfile,
  Venue,
} from "@/types/db";
import { buildSeed } from "./seed";

export interface DbSnapshot {
  users: User[];
  profiles: UserProfile[];
  privacy: PrivacyPreferences[];
  partners: Partner[];
  venues: Venue[];
  quests: Quest[];
  qrCodes: QrCode[];
  scans: ScanEvent[];
  attempts: QuestAttempt[];
  completions: QuestCompletion[];
  ledger: PointsLedgerEntry[];
  rewards: Reward[];
  redemptions: RewardRedemption[];
  notes: CommunityNote[];
  consents: ConsentEvent[];
  audit: AuditLog[];
}

const STORE_KEY = "sq.db";
const STORE_VERSION = 3;
const VERSION_KEY = "sq.db.version";

let memory: DbSnapshot | null = null;

function freshSnapshot(): DbSnapshot {
  return buildSeed();
}

export function loadDb(): DbSnapshot {
  if (memory) return memory;

  if (typeof window === "undefined") {
    memory = freshSnapshot();
    return memory;
  }

  const version = window.localStorage.getItem(VERSION_KEY);
  const raw = window.localStorage.getItem(STORE_KEY);

  if (!raw || version !== String(STORE_VERSION)) {
    memory = freshSnapshot();
    persist();
    window.localStorage.setItem(VERSION_KEY, String(STORE_VERSION));
    return memory;
  }

  try {
    memory = JSON.parse(raw) as DbSnapshot;
  } catch {
    memory = freshSnapshot();
    persist();
  }
  return memory;
}

export function persist(): void {
  if (typeof window === "undefined" || !memory) return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(memory));
}

/** Mutate the snapshot then persist. */
export function mutate<T>(fn: (db: DbSnapshot) => T): T {
  const db = loadDb();
  const result = fn(db);
  persist();
  return result;
}

export function resetDb(): void {
  memory = freshSnapshot();
  persist();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(VERSION_KEY, String(STORE_VERSION));
  }
}
