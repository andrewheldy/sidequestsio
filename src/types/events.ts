/**
 * SideQuests.io — Typed Analytics Events (Phase 12)
 * --------------------------------------------------
 * A discriminated union of every product event we emit. Keeping the catalogue
 * typed means the tracking call-site, the local sink, and any future warehouse
 * adapter all agree on the shape of each event.
 */

export type AppEventName =
  | "qr_scanned"
  | "nfc_tapped"
  | "quest_viewed"
  | "auth_started"
  | "auth_completed"
  | "quest_started"
  | "verification_started"
  | "verification_passed"
  | "verification_failed"
  | "quest_completed"
  | "points_awarded"
  | "reward_viewed"
  | "reward_redeemed"
  | "community_note_created"
  | "leaderboard_viewed"
  | "proof_captured"
  | "proof_shared";

/** Common envelope attached to every emitted event. */
export interface AppEventContext {
  user_id?: string | null;
  anonymous_session_id?: string;
  quest_id?: string;
  venue_id?: string | null;
  partner_id?: string;
  qr_code_id?: string | null;
  /** Free-form, privacy-safe properties (never PII). */
  props?: Record<string, string | number | boolean | null>;
}

export interface AppEvent extends AppEventContext {
  name: AppEventName;
  timestamp: string;
}
