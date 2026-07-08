/**
 * The flat `Quest` shape list/map surfaces render (Explore, Favorites, the
 * public /quests page, QuestMap). Populated from live repository data via
 * `questsWithContextToFlatQuests` (src/lib/quests/fromDb.ts) — the venue is
 * the source of truth for location, so `lat`/`lng` come from the linked
 * `venues` row.
 */

export interface Quest {
  id: string;
  title: string;
  neighborhood: string;
  category: string;
  reward: string;
  xp: number;
  distance: string;
  time: string;
  image: string;
  /** Normalized map position (0–100). Kept for backward compat. */
  x: number;
  y: number;
  /** Real-world GPS coordinates used by the Mapbox map. */
  lat: number;
  lng: number;
  /** Street address — populated for CRM-backed quests. */
  address?: string;
  /** Venue business name — populated when the quest is linked to a `venues` row. */
  venueName?: string;
  /** Short player-facing description — populated for repository-backed quests. */
  description?: string;
  /** The playful real-world action the user must complete at the venue. */
  funky_action?: string | null;
  proof_method?: string | null;
  social_share_prompt?: string | null;
  staff_phrase?: string | null;
  estimated_time?: string | null;
}

/** UI category labels — DB `quest_category` values map onto these via
 *  CATEGORY_LABELS in src/lib/quests/fromDb.ts. */
export const QUEST_CATEGORIES = [
  'All',
  'Foodie',
  'Nightlife',
  'Wellness',
  'Culture',
  'Outdoor',
  'Community',
  'Hidden Gems',
] as const;
