/**
 * SideQuests.io — Typed Analytics Events (Phase 12)
 * --------------------------------------------------
 * A discriminated union of every product event we emit. Keeping the catalogue
 * typed means the tracking call-site, the local sink, and any future warehouse
 * adapter all agree on the shape of each event.
 *
 * Quest page events (src/lib/analytics/questEvents.ts) follow two funnels that
 * must never be conflated:
 *   page_viewed → page_loaded → primary_action_viewed → primary_action_clicked
 *     → primary_action_started → primary_action_completed → reward_earned
 *   optional_action_viewed → optional_action_clicked (→ optional_action_completed,
 *     reserved: only a verified completion may emit it, and none exists yet)
 */

export type AppEventName =
  | "qr_scanned"
  | "nfc_tapped"
  | "quest_viewed"
  // --- Quest page ---------------------------------------------------------
  | "quest_page_viewed"               // route entered (fires before data loads)
  | "quest_page_loaded"               // quest data rendered (carries load_ms)
  | "quest_load_failed"               // error, timeout or not found
  | "quest_back_clicked"
  | "quest_hero_viewed"               // hero painted (image loaded or fallback)
  | "quest_share_clicked"             // share the quest page / completion caption
  | "quest_save_toggled"
  | "quest_primary_action_viewed"     // required-action card impression
  | "quest_primary_action_clicked"    // CTA tap, any state (props.cta_state)
  | "quest_primary_action_started"    // user confirmed; completion attempt begins
  | "quest_primary_action_completed"  // server accepted the completion
  | "quest_primary_action_failed"     // server rejected it (props.reason)
  | "quest_optional_action_viewed"    // Explore & Share card impression
  | "quest_optional_action_clicked"   // outbound click — NOT a completion
  | "quest_optional_action_completed" // reserved for verified completions
  | "quest_action_failed"             // unexpected error in any action handler
  | "venue_card_viewed"
  | "venue_website_clicked"
  | "reward_impression"               // points badge seen
  | "reward_earned"                   // XP/points credited by the server
  // --- Navigation ---------------------------------------------------------
  | "nav_rewards_clicked"
  | "nav_map_clicked"
  | "nav_profile_clicked"
  // --- Other surfaces -----------------------------------------------------
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
  | "proof_shared"
  | "capture_moment_photo"
  | "capture_moment_video"
  | "capture_moment_share"
  | "capture_moment_download"
  | "capture_moment_click"
  | "concept_interaction";  // demo interactions on pitch/concept pages (e.g. /iiipoints)

/** Common envelope attached to every emitted event. */
export interface AppEventContext {
  user_id?: string | null;
  /** Stable per-browser id (localStorage). */
  anonymous_session_id?: string;
  quest_id?: string;
  venue_id?: string | null;
  partner_id?: string | null;
  /** Sponsored-quest attribution. No columns back these yet, so they are null today. */
  campaign_id?: string | null;
  activation_id?: string | null;
  qr_code_id?: string | null;
  /** Action identity on quest pages: data id ("primary", "instagram"), type and stable CTA id. */
  action_id?: string | null;
  action_type?: string | null;
  tracking_id?: string | null;
  /** Populated for `link_clicked` events — identifies which link type was tapped. */
  link_type?: string;
  /** Free-form, privacy-safe properties (never PII). */
  props?: Record<string, string | number | boolean | null>;
}

export interface AppEvent extends AppEventContext {
  name: AppEventName;
  timestamp: string;
  /** Per-tab browsing session (sessionStorage); resets when the tab closes. */
  session_id?: string;
  /** Path only — no query string, so codes and tokens never reach analytics. */
  page_path?: string;
  device_type?: string;
  viewport_width?: number;
}
