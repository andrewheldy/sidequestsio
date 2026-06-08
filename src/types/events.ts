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
  | "quest_page_viewed"     // direct page visit (distinct from QR scan flow)
  | "quest_page_view"       // alias used by funky action tracking
  | "action_card_view"      // funky action card becomes visible
  | "complete_quest_click"  // user taps the Complete Quest button
  | "proof_started"         // user begins proof capture flow
  | "proof_submitted"       // user submits proof
  | "google_review_click"   // user taps Google Reviews link
  | "website_click"         // user taps website link
  | "social_share_click"    // user taps a social share button
  | "link_clicked"          // business/host link tapped on a quest page
  | "checkin_started"       // user initiates the check-in / completion flow
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
  | "breadcrumb_created"    // alias for community_note_created; preferred in new UI
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
  /** Populated for `link_clicked` events — identifies which link type was tapped. */
  link_type?: string;
  /** Free-form, privacy-safe properties (never PII). */
  props?: Record<string, string | number | boolean | null>;
}

export interface AppEvent extends AppEventContext {
  name: AppEventName;
  timestamp: string;
}
