import type { QuestCard } from './types';

/**
 * Re-ranks the top of a server-ordered page for variety: at most `perVenue`
 * quests from one venue and `perCategory` from one category within the first
 * `window` slots, when enough eligible alternatives exist. It only reorders;
 * nothing is added or dropped.
 */
export function diversifyTop(items: QuestCard[], window = 6, perVenue = 2, perCategory = 3): QuestCard[] {
  const remaining = [...items];
  const top: QuestCard[] = [];
  const venues = new Map<string, number>();
  const categories = new Map<string, number>();
  const fits = (item: QuestCard) =>
    (!item.venueId || (venues.get(item.venueId) ?? 0) < perVenue) && (categories.get(item.category) ?? 0) < perCategory;

  while (top.length < window && remaining.length) {
    const index = Math.max(0, remaining.findIndex(fits));
    const [next] = remaining.splice(index, 1);
    top.push(next);
    if (next.venueId) venues.set(next.venueId, (venues.get(next.venueId) ?? 0) + 1);
    categories.set(next.category, (categories.get(next.category) ?? 0) + 1);
  }
  return [...top, ...remaining];
}
