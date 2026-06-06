/**
 * SideQuests.io — Domain Types
 * --------------------------------
 * Single source of truth for the application's data model. These types mirror
 * the PostgreSQL/Supabase schema in `supabase/migrations` and are shared by
 * every repository implementation (local mock + Supabase) and the UI.
 *
 * Conventions:
 *  - All ids are opaque strings (uuid in Postgres, nanoid in the local mock).
 *  - All timestamps are ISO-8601 strings.
 *  - Enums are modelled as string unions so they survive serialization and map
 *    directly onto Postgres enum / check-constrained text columns.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type Role = "user" | "partner" | "admin";

export type AccountStatus = "active" | "suspended" | "deleted";

export type PartnerType = "venue" | "brand" | "event" | "nonprofit" | "other";
export type PartnerStatus = "pending" | "active" | "suspended";

export type EntityStatus = "draft" | "active" | "paused" | "archived";

export type QuestCategory =
  | "art"
  | "food"
  | "outdoors"
  | "culture"
  | "nightlife"
  | "shopping"
  | "fitness"
  | "hidden_gem";

export type Difficulty = "easy" | "medium" | "hard";

export type VerificationType =
  | "qr"
  | "nfc"
  | "gps"
  | "venue_code"
  | "staff_approval";

export type ScanConversionState =
  | "scanned"
  | "viewed"
  | "authenticated"
  | "started"
  | "completed";

export type AttemptStatus =
  | "in_progress"
  | "completed"
  | "failed"
  | "abandoned";

export type LedgerTransactionType = "earn" | "spend" | "adjust" | "expire";

export type LedgerSource =
  | "quest_completion"
  | "reward_redemption"
  | "admin_adjustment"
  | "bonus"
  | "referral";

export type ModerationStatus = "pending" | "approved" | "rejected" | "flagged";

export type RedemptionStatus = "issued" | "redeemed" | "expired" | "cancelled";

export type LeaderboardScope = "global" | "city" | "venue" | "campaign";
export type LeaderboardPeriod = "weekly" | "monthly" | "all_time";

export type ConsentType = "analytics" | "marketing" | "location";
export type Visibility = "public" | "friends" | "private";

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

// ---------------------------------------------------------------------------
// Core identity
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  role: Role;
  created_at: string;
  last_active_at: string;
  account_status: AccountStatus;
}

export interface UserProfile {
  user_id: string;
  home_city: string | null;
  xp: number;
  level: number;
  /** Cached balance for fast reads — the ledger is the source of truth. */
  points_balance_cache: number;
  lifetime_points: number;
  completed_quests_count: number;
  community_notes_count: number;
  rewards_redeemed_count: number;
}

export interface PrivacyPreferences {
  user_id: string;
  analytics_consent: boolean;
  marketing_consent: boolean;
  location_consent: boolean;
  leaderboard_visibility: Visibility;
  profile_visibility: Visibility;
}

// ---------------------------------------------------------------------------
// Partners / venues
// ---------------------------------------------------------------------------

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  contact_email: string;
  status: PartnerStatus;
  /** Owning user account(s) for partner-portal access (RBAC). */
  owner_user_id: string | null;
  created_at: string;
}

export interface Venue {
  id: string;
  partner_id: string;
  name: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  status: EntityStatus;
}

// ---------------------------------------------------------------------------
// Quests
// ---------------------------------------------------------------------------

export interface Quest {
  id: string;
  partner_id: string;
  venue_id: string | null;
  title: string;
  description: string;
  category: QuestCategory;
  difficulty: Difficulty;
  xp_reward: number;
  points_reward: number;
  status: EntityStatus;
  start_date: string | null;
  end_date: string | null;
  verification_type: VerificationType;
  /** Optional shared secret for `venue_code` verification. */
  verification_secret: string | null;
  image_url: string | null;
  created_at: string;
}

export interface QrCode {
  id: string;
  quest_id: string;
  venue_id: string | null;
  partner_id: string;
  /** Short, URL-safe public code used in /scan/[code]. */
  code: string;
  destination_url: string;
  status: EntityStatus;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Tracking & attempts
// ---------------------------------------------------------------------------

export interface ScanEvent {
  id: string;
  qr_code_id: string | null;
  quest_id: string;
  venue_id: string | null;
  partner_id: string;
  user_id: string | null;
  anonymous_session_id: string;
  timestamp: string;
  device_type: DeviceType;
  browser: string | null;
  operating_system: string | null;
  referrer: string | null;
  /** Coarse "city, region" string only — never precise coordinates. */
  approximate_location: string | null;
  location_permission_granted: boolean;
  conversion_state: ScanConversionState;
}

export interface QuestAttempt {
  id: string;
  user_id: string;
  quest_id: string;
  started_at: string;
  completed_at: string | null;
  status: AttemptStatus;
  verification_method: VerificationType | null;
  failure_reason: string | null;
}

export interface QuestCompletion {
  id: string;
  user_id: string;
  quest_id: string;
  venue_id: string | null;
  partner_id: string;
  completed_at: string;
  xp_awarded: number;
  points_awarded: number;
  source_scan_id: string | null;
}

// ---------------------------------------------------------------------------
// Community notes
// ---------------------------------------------------------------------------

export interface CommunityNote {
  id: string;
  user_id: string;
  quest_id: string;
  venue_id: string | null;
  content: string;
  image_url: string | null;
  moderation_status: ModerationStatus;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Points ledger & rewards
// ---------------------------------------------------------------------------

export interface PointsLedgerEntry {
  id: string;
  user_id: string;
  transaction_type: LedgerTransactionType;
  source: LedgerSource;
  points_amount: number;
  xp_amount: number;
  quest_id: string | null;
  reward_id: string | null;
  partner_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Reward {
  id: string;
  partner_id: string;
  title: string;
  description: string;
  points_cost: number;
  /** null = unlimited inventory. */
  inventory: number | null;
  status: EntityStatus;
  expiration_date: string | null;
  image_url: string | null;
}

export interface RewardRedemption {
  id: string;
  user_id: string;
  reward_id: string;
  partner_id: string;
  points_spent: number;
  redemption_code: string;
  status: RedemptionStatus;
  redeemed_at: string;
}

// ---------------------------------------------------------------------------
// Leaderboards & analytics
// ---------------------------------------------------------------------------

export interface LeaderboardSnapshot {
  id: string;
  scope_type: LeaderboardScope;
  scope_id: string | null;
  user_id: string;
  score: number;
  rank: number;
  period: LeaderboardPeriod;
  created_at: string;
}

export interface AnalyticsRollup {
  id: string;
  partner_id: string;
  venue_id: string | null;
  quest_id: string | null;
  date: string; // YYYY-MM-DD
  scans: number;
  unique_visitors: number;
  authenticated_users: number;
  completions: number;
  rewards_redeemed: number;
  community_notes_created: number;
}

// ---------------------------------------------------------------------------
// Governance: consent & audit
// ---------------------------------------------------------------------------

export interface ConsentEvent {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  granted: boolean;
  timestamp: string;
  source: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Convenience view-models (joined shapes the UI consumes)
// ---------------------------------------------------------------------------

export interface QuestWithContext extends Quest {
  partner?: Partner;
  venue?: Venue;
}

export interface LeaderboardRow {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  score: number;
  is_self?: boolean;
}

export interface CommunityNoteWithAuthor extends CommunityNote {
  author_display_name: string;
  author_avatar_url: string | null;
}
