import type { QuestCategory, QuestWithContext } from '../../lib/types';
import { distanceToQuest, type Coords } from './geo';
import { categoryLabels, neighborhoodOf } from './questFormat';

export interface Filters {
  category: QuestCategory | null;
  neighborhood: string | null;
}

export const NO_FILTERS: Filters = { category: null, neighborhood: null };

/** Categories present in the data, in a stable display order. */
export function categoriesIn(quests: QuestWithContext[]): QuestCategory[] {
  const present = new Set(quests.map((q) => q.category));
  return (Object.keys(categoryLabels) as QuestCategory[]).filter((c) => present.has(c));
}

export function neighborhoodsIn(quests: QuestWithContext[]): string[] {
  return [...new Set(quests.map(neighborhoodOf).filter((n): n is string => !!n))].sort((a, b) => a.localeCompare(b));
}

export function applyFilters(quests: QuestWithContext[], filters: Filters): QuestWithContext[] {
  return quests.filter(
    (q) =>
      (!filters.category || q.category === filters.category) &&
      (!filters.neighborhood || neighborhoodOf(q) === filters.neighborhood),
  );
}

/** Nearest first; quests without a known distance keep their order after the rest. */
export function sortByDistance(quests: QuestWithContext[], from: Coords | null): QuestWithContext[] {
  if (!from) return quests;
  return quests
    .map((quest, index) => ({ quest, index, miles: distanceToQuest(from, quest) }))
    .sort((a, b) => {
      if (a.miles == null && b.miles == null) return a.index - b.index;
      if (a.miles == null) return 1;
      if (b.miles == null) return -1;
      return a.miles - b.miles;
    })
    .map((x) => x.quest);
}
