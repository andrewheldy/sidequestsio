/**
 * XP & Leveling math (Phase 8).
 *
 * A simple, monotonic curve: each level costs progressively more XP. The curve
 * lives here (not in the DB) so it can evolve without a migration, while the
 * cached `level` column is recomputed on every XP award.
 *
 *   xpForLevel(n) = 100 * n * (n - 1) / 2   (triangular growth)
 *
 * Level 1 starts at 0 XP. Level 2 at 100, Level 3 at 300, Level 4 at 600, ...
 */

/** Total cumulative XP required to *reach* the given level. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round((100 * level * (level - 1)) / 2);
}

/** Resolve a raw XP total into a 1-based level. */
export function levelForXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  return level;
}

export interface LevelProgress {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpToNext: number;
  /** 0..1 progress toward the next level. */
  progress: number;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const span = Math.max(1, nextLevelXp - currentLevelXp);
  const xpIntoLevel = xp - currentLevelXp;
  return {
    level,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel,
    xpToNext: nextLevelXp - xp,
    progress: Math.min(1, xpIntoLevel / span),
  };
}
