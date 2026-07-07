/**
 * Adapts repository-shaped quests (DB schema, venue as source of truth for
 * location) into the flat `Quest` shape `QuestMap` renders.
 */
import type { Quest as FlatQuest } from '@/lib/quests';
import type { QuestCategory, QuestWithContext } from '@/types/db';

// DB `quest_category` enum -> UI category label used by CATEGORY_COLORS /
// CATEGORY_EMOJIS (src/lib/mapbox.ts) and QUEST_CATEGORIES (src/lib/quests.ts).
// No 1:1 mapping exists for every enum value; "shopping" and "fitness" map to
// the closest UI bucket rather than introducing new categories.
const CATEGORY_LABELS: Record<QuestCategory, string> = {
  art: 'Culture',
  food: 'Foodie',
  outdoors: 'Outdoor',
  culture: 'Culture',
  nightlife: 'Nightlife',
  shopping: 'Community',
  fitness: 'Wellness',
  hidden_gem: 'Hidden Gems',
};

/**
 * Converts a `QuestWithContext` into the flat `Quest` shape `QuestMap` expects.
 * Returns `null` when the linked venue is missing or has invalid coordinates —
 * callers should filter these out rather than render a pin at (0, 0) or NaN.
 */
export function questWithContextToFlatQuest(q: QuestWithContext): FlatQuest | null {
  const venue = q.venue;
  const lat = venue?.latitude;
  const lng = venue?.longitude;

  if (
    lat == null || lng == null ||
    !Number.isFinite(lat) || !Number.isFinite(lng) ||
    (lat === 0 && lng === 0)
  ) {
    return null;
  }

  return {
    id: q.id,
    title: q.title,
    neighborhood: venue?.neighborhood || venue?.city || '',
    category: CATEGORY_LABELS[q.category] ?? 'Hidden Gems',
    reward: `+${q.xp_reward} XP`,
    xp: q.xp_reward,
    distance: '',
    time: q.estimated_time || '',
    image: q.image_url || '',
    x: 50,
    y: 50,
    lat,
    lng,
    address: venue?.address || undefined,
    venueName: venue?.name || undefined,
    funky_action: q.funky_action,
    proof_method: q.proof_method,
    social_share_prompt: q.social_share_prompt,
    staff_phrase: q.staff_phrase,
    estimated_time: q.estimated_time,
  };
}

/** Maps a list of `QuestWithContext`, dropping any without valid venue coordinates. */
export function questsWithContextToFlatQuests(quests: QuestWithContext[]): FlatQuest[] {
  return quests
    .map(questWithContextToFlatQuest)
    .filter((q): q is FlatQuest => q !== null);
}
