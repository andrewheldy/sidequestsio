/**
 * Campaign (brand activation) configuration.
 *
 * A campaign is a themed presentation layer over the existing quest engine: it
 * names a set of missions, how they look, and what the page must disclose. It
 * owns no quest logic. A mission that names a live quest is played, verified
 * and rewarded by that quest (`/quests/:id` → complete_quest()); a mission
 * without one is concept content and can only be previewed.
 */

import type { Difficulty } from "@/types/db";

/** How a mission is verified. `question` and `records` have no live engine support yet. */
export type MissionVerification = "gps" | "photo" | "question" | "records";

export interface MissionQuestion {
  prompt: string;
  options: string[];
  answer: string;
}

export interface CampaignMission {
  id: string;
  /** Two-digit display number, e.g. "01". */
  number: string;
  title: string;
  neighborhood: string;
  /** The public place the mission points at. */
  place: string;
  /** Absent for missions without a single location (composites). */
  lat?: number;
  lng?: number;
  /** Concept tier; rewards come from REWARD_TIERS, never from this file. */
  difficulty: Difficulty;
  estimatedTime?: string;
  objective: string;
  verification: MissionVerification[];
  /** Key into the campaign's artwork set. */
  art: string;
  /** Alt text for the artwork. */
  artAlt: string;
  /**
   * Exact title of the live quest that plays this mission, when one exists.
   * Resolved against active quests at runtime; unresolved = concept mission.
   */
  liveQuestTitle?: string;
  /** Composite missions: ids of the missions that must be done first. */
  requires?: string[];
  /** Demo-only knowledge check (`question` verification). */
  question?: MissionQuestion;
  /** Shown in the mission brief, e.g. public-space or access guidance. */
  note?: string;
}

export interface CampaignConfig {
  slug: string;
  /** `concept` campaigns are unofficial demonstrations and must say so. */
  status: "concept" | "live";
  name: string;
  tagline: string;
  intro: string;
  /** Shown near the hero and in the footer. */
  disclosure: string;
  /** Human-readable run dates; null while the campaign has none. */
  duration: string | null;
  /** Confirmed brand partners and sponsors. Empty for an unofficial concept. */
  partners: string[];
  head: {
    title: string;
    description: string;
    themeColor: string;
    /** Concept pages stay out of search indexes. */
    noindex: boolean;
    fontsHref: string;
  };
  /** `props.page` on every analytics event the campaign emits. */
  analyticsPage: string;
  /** [lng, lat] the map opens on. */
  mapCenter: [number, number];
  missions: CampaignMission[];
}
