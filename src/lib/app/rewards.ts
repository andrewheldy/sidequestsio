/**
 * Quest reward tiers — the one place the standard XP / Points values live.
 *
 * Quest rows still store their own `xp_reward` / `points_reward` (cards, the
 * quest page and the completion screen render those, and `complete_quest()`
 * awards them), so changing a tier here never rewrites existing quests or
 * historical completions. These values are the defaults for newly authored
 * quests and the check the content importer warns against.
 *
 * `legendary` is a reward tier, not a stored difficulty: the database
 * `difficulty` enum is easy | medium | hard (see docs/DECISIONS.md, 2026-10-24).
 */

import type { Difficulty } from "@/types/db";

export type RewardTier = Difficulty | "legendary";

export interface TierReward {
  xp: number;
  points: number;
}

export const REWARD_TIERS: Readonly<Record<RewardTier, Readonly<TierReward>>> = Object.freeze({
  easy: Object.freeze({ xp: 50, points: 25 }),
  medium: Object.freeze({ xp: 150, points: 75 }),
  hard: Object.freeze({ xp: 300, points: 150 }),
  legendary: Object.freeze({ xp: 500, points: 300 }),
});

export const REWARD_TIER_ORDER: readonly RewardTier[] = ["easy", "medium", "hard", "legendary"];

/** Standard reward for a tier; unknown values fall back to easy. */
export function rewardForTier(tier: string): TierReward {
  const reward = REWARD_TIERS[tier as RewardTier] ?? REWARD_TIERS.easy;
  return { xp: reward.xp, points: reward.points };
}
