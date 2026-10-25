import type { QuestWithContext } from '../../lib/types';
import { NEIGHBORHOODS, type OnboardingSelections } from './data';

/** vibe -> quest categories. `community` has no category, so it never matches by itself. */
export const VIBE_CATEGORIES: Record<string, string[]> = {
  foodie: ['food'],
  nightlife: ['nightlife'],
  culture: ['culture', 'art'],
  outdoor: ['outdoors'],
  wellness: ['fitness'],
  'hidden-gems': ['hidden_gem'],
  community: [],
};

const squash = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Up to `max` real, active quests for the chosen vibes. The category match is
 * required; a venue in the chosen neighbourhood only ranks a match higher.
 * Returns [] when nothing matches (the UI says so honestly).
 */
export function suggestQuests(quests: QuestWithContext[], selections: OnboardingSelections, max = 3): QuestWithContext[] {
  const categories = new Set(selections.vibes.flatMap((v) => VIBE_CATEGORIES[v] ?? []));
  if (categories.size === 0) return [];
  const area = NEIGHBORHOODS.find((n) => n.id === selections.neighborhood);
  const areaKeys = area ? [squash(area.label), squash(area.id)] : [];

  return quests
    .map((quest, index) => {
      if (!categories.has(quest.category)) return null;
      const venueArea = squash(quest.venue?.neighborhood);
      const inArea = !!venueArea && areaKeys.some((k) => k === venueArea || venueArea.includes(k));
      return { quest, index, score: inArea ? 1 : 0 };
    })
    .filter((x): x is { quest: QuestWithContext; index: number; score: number } => x !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, max)
    .map((x) => x.quest);
}

export const CATEGORY_LABELS: Record<string, string> = {
  art: 'Art',
  food: 'Food',
  outdoors: 'Outdoors',
  culture: 'Culture',
  nightlife: 'Nightlife',
  shopping: 'Shopping',
  fitness: 'Wellness',
  hidden_gem: 'Hidden gem',
};
