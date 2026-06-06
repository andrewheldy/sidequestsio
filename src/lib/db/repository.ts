/**
 * Repository interface — the backend-agnostic data-access contract.
 * --------------------------------------------------------------------------
 * Every screen and service talks to a `Repository`, never to Supabase or
 * localStorage directly. This lets the app run fully in the browser against the
 * `LocalRepository` (no credentials required) and switch to `SupabaseRepository`
 * in production by setting env vars — without changing a single call-site.
 *
 * Mutations that must be atomic & abuse-resistant (quest completion, reward
 * redemption) are modelled as single repository methods so each backend can
 * implement them transactionally (a Postgres RPC for Supabase; a guarded
 * in-memory transaction for the mock).
 */

import type {
  AnalyticsSummary,
} from "./types";
import type {
  AuditLog,
  CommunityNote,
  CommunityNoteWithAuthor,
  ConsentEvent,
  ConsentType,
  EntityStatus,
  LeaderboardPeriod,
  LeaderboardRow,
  LeaderboardScope,
  ModerationStatus,
  Partner,
  PointsLedgerEntry,
  PrivacyPreferences,
  Quest,
  QuestAttempt,
  QuestCompletion,
  QuestWithContext,
  QrCode,
  Reward,
  RewardRedemption,
  Role,
  ScanEvent,
  User,
  UserProfile,
  Venue,
  VerificationType,
} from "@/types/db";

// ---------------------------------------------------------------------------
// Input / result shapes
// ---------------------------------------------------------------------------

export interface QuestFilter {
  city?: string;
  category?: Quest["category"];
  status?: EntityStatus;
  partnerId?: string;
}

export interface RecordScanInput {
  questId: string;
  qrCodeId?: string | null;
  code?: string;
  userId?: string | null;
  anonymousSessionId: string;
}

export interface CompleteQuestInput {
  userId: string;
  questId: string;
  verificationMethod: VerificationType;
  /** Required when the quest uses `venue_code` verification. */
  venueCode?: string;
  sourceScanId?: string | null;
}

export type CompleteQuestError =
  | "not_found"
  | "already_completed"
  | "quest_inactive"
  | "quest_expired"
  | "verification_failed";

export interface CompleteQuestResult {
  ok: boolean;
  error?: CompleteQuestError;
  completion?: QuestCompletion;
  xpAwarded?: number;
  pointsAwarded?: number;
  newLevel?: number;
  leveledUp?: boolean;
}

export interface RedeemRewardInput {
  userId: string;
  rewardId: string;
}

export type RedeemRewardError =
  | "not_found"
  | "insufficient_points"
  | "out_of_stock"
  | "inactive"
  | "expired";

export interface RedeemRewardResult {
  ok: boolean;
  error?: RedeemRewardError;
  redemption?: RewardRedemption;
}

export interface CreateNoteInput {
  userId: string;
  questId: string;
  content: string;
  imageUrl?: string | null;
}

export type CreateNoteError = "too_long" | "not_completed" | "not_found" | "empty";

export interface CreateNoteResult {
  ok: boolean;
  error?: CreateNoteError;
  note?: CommunityNote;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export interface Repository {
  // --- Users -------------------------------------------------------------
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  upsertUser(input: Partial<User> & { email: string }): Promise<User>;
  updateUser(id: string, patch: Partial<User>): Promise<User>;
  listUsers(): Promise<User[]>;

  // --- Profiles ----------------------------------------------------------
  getProfile(userId: string): Promise<UserProfile | null>;
  updateProfile(userId: string, patch: Partial<UserProfile>): Promise<UserProfile>;

  // --- Privacy & consent -------------------------------------------------
  getPrivacy(userId: string): Promise<PrivacyPreferences>;
  updatePrivacy(
    userId: string,
    patch: Partial<PrivacyPreferences>,
  ): Promise<PrivacyPreferences>;
  recordConsent(input: {
    userId: string;
    consentType: ConsentType;
    granted: boolean;
    source: string;
  }): Promise<ConsentEvent>;

  // --- Partners & venues -------------------------------------------------
  listPartners(): Promise<Partner[]>;
  getPartner(id: string): Promise<Partner | null>;
  getPartnerByOwner(userId: string): Promise<Partner | null>;
  upsertPartner(input: Partial<Partner> & { name: string }): Promise<Partner>;
  listVenues(partnerId?: string): Promise<Venue[]>;
  getVenue(id: string): Promise<Venue | null>;
  upsertVenue(input: Partial<Venue> & { partner_id: string; name: string }): Promise<Venue>;

  // --- Quests ------------------------------------------------------------
  listQuests(filter?: QuestFilter): Promise<QuestWithContext[]>;
  getQuest(id: string): Promise<QuestWithContext | null>;
  upsertQuest(input: Partial<Quest> & { partner_id: string; title: string }): Promise<Quest>;

  // --- QR codes ----------------------------------------------------------
  getQrByCode(code: string): Promise<QrCode | null>;
  listQrCodes(partnerId?: string): Promise<QrCode[]>;
  createQrCode(input: { questId: string; partnerId: string; venueId?: string | null }): Promise<QrCode>;

  // --- Scans -------------------------------------------------------------
  recordScan(input: RecordScanInput): Promise<ScanEvent>;
  markScanConverted(scanId: string, state: ScanEvent["conversion_state"]): Promise<void>;
  listScans(filter?: { partnerId?: string; questId?: string; limit?: number }): Promise<ScanEvent[]>;

  // --- Attempts & completion --------------------------------------------
  startQuest(userId: string, questId: string): Promise<QuestAttempt>;
  hasCompleted(userId: string, questId: string): Promise<boolean>;
  completeQuest(input: CompleteQuestInput): Promise<CompleteQuestResult>;
  listCompletions(userId: string): Promise<QuestCompletion[]>;

  // --- Points ledger -----------------------------------------------------
  listLedger(userId: string): Promise<PointsLedgerEntry[]>;
  /** Admin-only manual adjustment. */
  adjustPoints(input: {
    userId: string;
    points: number;
    xp?: number;
    reason: string;
    actorId: string;
  }): Promise<PointsLedgerEntry>;

  // --- Rewards -----------------------------------------------------------
  listRewards(filter?: { partnerId?: string; status?: EntityStatus }): Promise<Reward[]>;
  getReward(id: string): Promise<Reward | null>;
  upsertReward(input: Partial<Reward> & { partner_id: string; title: string }): Promise<Reward>;
  redeemReward(input: RedeemRewardInput): Promise<RedeemRewardResult>;
  listRedemptions(filter: { userId?: string; partnerId?: string }): Promise<RewardRedemption[]>;

  // --- Community notes ---------------------------------------------------
  listNotesByQuest(questId: string): Promise<CommunityNoteWithAuthor[]>;
  createNote(input: CreateNoteInput): Promise<CreateNoteResult>;
  listNotesForModeration(status?: ModerationStatus): Promise<CommunityNoteWithAuthor[]>;
  setNoteModeration(noteId: string, status: ModerationStatus): Promise<void>;

  // --- Leaderboards ------------------------------------------------------
  getLeaderboard(input: {
    scope: LeaderboardScope;
    scopeId?: string | null;
    period: LeaderboardPeriod;
    selfUserId?: string | null;
    limit?: number;
  }): Promise<LeaderboardRow[]>;

  // --- Analytics ---------------------------------------------------------
  getPartnerAnalytics(partnerId: string): Promise<AnalyticsSummary>;
  getPlatformAnalytics(): Promise<AnalyticsSummary>;

  // --- Audit -------------------------------------------------------------
  listAudit(limit?: number): Promise<AuditLog[]>;
  addAudit(input: {
    actorId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<AuditLog>;
}

export type { Role };
