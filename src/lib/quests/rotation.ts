import type { Quest } from '@/lib/quests';
import type { QuestCompletion } from '@/types/db';

/**
 * Per-user "Featured detour" rotation for Explore.
 *
 * - Quests the user cannot do right now (completed once-ever quests, or
 *   repeatable quests still in cooldown) are never featured and sort last.
 * - Each user gets their own shuffled order of quests (hash of user + quest id)
 *   and the pick steps one place along it per local calendar day: the same all
 *   day, a different quest tomorrow whenever there is more than one to choose
 *   from, and different users see different picks.
 */
export function rotateFeatured(
  quests: Quest[],
  completions: QuestCompletion[],
  seed: string,
  now: Date = new Date(),
): { featured: Quest | undefined; rest: Quest[] } {
  const locked = lockedQuestIds(quests, completions, now);
  const open = quests.filter((q) => !locked.has(q.id));
  const pool = open.length > 0 ? open : quests;
  if (pool.length === 0) return { featured: undefined, rest: [] };

  const order = [...pool].sort((a, b) => hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`));
  const featured = order[localDayNumber(now) % order.length];
  const rest = quests.filter((q) => q.id !== featured.id);
  // Stable partition: doable quests first, locked ones after, original order kept.
  return {
    featured,
    rest: [...rest.filter((q) => !locked.has(q.id)), ...rest.filter((q) => locked.has(q.id))],
  };
}

function lockedQuestIds(quests: Quest[], completions: QuestCompletion[], now: Date): Set<string> {
  const lastCompleted = new Map<string, number>();
  for (const c of completions) {
    const t = new Date(c.completed_at).getTime();
    if (t > (lastCompleted.get(c.quest_id) ?? -Infinity)) lastCompleted.set(c.quest_id, t);
  }
  const locked = new Set<string>();
  for (const q of quests) {
    const last = lastCompleted.get(q.id);
    if (last === undefined) continue;
    if (q.repeatCooldownDays == null || last + q.repeatCooldownDays * 86_400_000 > now.getTime()) {
      locked.add(q.id);
    }
  }
  return locked;
}

/** Days since the epoch for the viewer's local calendar date. */
function localDayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

/**
 * 32-bit FNV-1a with a murmur3 finalizer: small, stable across sessions and
 * devices, and well mixed even when inputs differ only in their last characters.
 */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}
