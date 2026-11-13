/**
 * Resolves a campaign's missions against live quest data.
 *
 * Pure functions, so the rules that keep the page honest are testable:
 *  - A mission backed by an active quest shows that quest's rewards, because
 *    complete_quest() pays the quest row, not the campaign's concept tier.
 *  - Only a server completion record makes a mission `completed`. A demo
 *    preview is `previewed` and its XP is reported separately, never as earned.
 *  - Composite missions have no engine support, so they can never be `completed`.
 */

import type { Difficulty } from "@/types/db";
import { REWARD_TIERS } from "../app/rewards";
import type { CampaignMission } from "./types";

export interface LiveQuestRef {
  id: string;
  title: string;
  status: string;
  difficulty: Difficulty;
  xp_reward: number;
  points_reward: number;
}

export interface CompletionRef {
  quest_id: string;
  xp_awarded: number;
  points_awarded: number;
}

export type MissionMode = "live" | "concept" | "composite";
export type MissionStatus = "completed" | "previewed" | "available" | "locked";

export interface ResolvedMission {
  mission: CampaignMission;
  mode: MissionMode;
  /** Set in `live` mode: the quest that plays this mission. */
  questId?: string;
  difficulty: Difficulty;
  /** What completing pays: the live quest's values, else the concept tier. */
  xp: number;
  points: number;
  status: MissionStatus;
  /** Credited by the server for this mission (0 unless `completed`). */
  verifiedXp: number;
  verifiedPoints: number;
  /** Composite missions: required missions done / required. */
  progress?: { done: number; total: number };
}

const normalize = (title: string) => title.trim().toLowerCase();

export function resolveMissions(
  missions: CampaignMission[],
  quests: LiveQuestRef[],
  completions: CompletionRef[],
  previewed: ReadonlySet<string>,
): ResolvedMission[] {
  const activeByTitle = new Map<string, LiveQuestRef>();
  for (const quest of quests) {
    if (quest.status === "active") activeByTitle.set(normalize(quest.title), quest);
  }
  // A repeatable quest can have several completions; a mission counts once.
  const completionByQuest = new Map<string, CompletionRef>();
  for (const completion of completions) {
    if (!completionByQuest.has(completion.quest_id)) completionByQuest.set(completion.quest_id, completion);
  }

  const resolved = new Map<string, ResolvedMission>();

  for (const mission of missions) {
    if (mission.requires?.length) continue;
    const quest = mission.liveQuestTitle ? activeByTitle.get(normalize(mission.liveQuestTitle)) : undefined;
    const completion = quest ? completionByQuest.get(quest.id) : undefined;
    const tier = REWARD_TIERS[mission.difficulty];
    resolved.set(mission.id, {
      mission,
      mode: quest ? "live" : "concept",
      questId: quest?.id,
      difficulty: quest?.difficulty ?? mission.difficulty,
      xp: quest?.xp_reward ?? tier.xp,
      points: quest?.points_reward ?? tier.points,
      status: completion ? "completed" : previewed.has(mission.id) ? "previewed" : "available",
      verifiedXp: completion?.xp_awarded ?? 0,
      verifiedPoints: completion?.points_awarded ?? 0,
    });
  }

  for (const mission of missions) {
    if (!mission.requires?.length) continue;
    const done = mission.requires.filter((id) => {
      const status = resolved.get(id)?.status;
      return status === "completed" || status === "previewed";
    }).length;
    const total = mission.requires.length;
    const tier = REWARD_TIERS[mission.difficulty];
    resolved.set(mission.id, {
      mission,
      mode: "composite",
      difficulty: mission.difficulty,
      xp: tier.xp,
      points: tier.points,
      status: done === total ? "previewed" : "locked",
      verifiedXp: 0,
      verifiedPoints: 0,
      progress: { done, total },
    });
  }

  return missions.map((mission) => resolved.get(mission.id)!);
}

export interface CampaignSummary {
  total: number;
  /** Missions with a server completion record. */
  verified: number;
  /** Missions finished only as a demo preview. */
  previewed: number;
  available: number;
  /** XP / Points the server actually credited. */
  verifiedXp: number;
  verifiedPoints: number;
  /** What the previewed missions would pay. Illustrative, never credited. */
  demoXp: number;
  demoPoints: number;
  /** 0–100, counting verified and previewed missions. */
  percent: number;
}

export function summarizeCampaign(resolved: ResolvedMission[]): CampaignSummary {
  const summary: CampaignSummary = {
    total: resolved.length,
    verified: 0,
    previewed: 0,
    available: 0,
    verifiedXp: 0,
    verifiedPoints: 0,
    demoXp: 0,
    demoPoints: 0,
    percent: 0,
  };
  for (const item of resolved) {
    if (item.status === "completed") {
      summary.verified += 1;
      summary.verifiedXp += item.verifiedXp;
      summary.verifiedPoints += item.verifiedPoints;
    } else if (item.status === "previewed") {
      summary.previewed += 1;
      summary.demoXp += item.xp;
      summary.demoPoints += item.points;
    } else {
      summary.available += 1;
    }
  }
  if (summary.total > 0) {
    summary.percent = Math.round(((summary.verified + summary.previewed) / summary.total) * 100);
  }
  return summary;
}
