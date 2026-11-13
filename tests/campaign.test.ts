// Campaign mission resolution — run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { REWARD_TIERS } from "../src/lib/app/rewards";
import { resolveMissions, summarizeCampaign, type LiveQuestRef } from "../src/lib/campaigns/missions";
import { VICE_CAMPAIGN } from "../src/lib/campaigns/vice";

const missions = VICE_CAMPAIGN.missions;
const byId = (list: ReturnType<typeof resolveMissions>, id: string) => list.find((m) => m.mission.id === id)!;

const bayfront: LiveQuestRef = {
  id: "q-bayfront",
  title: "Bayfront Park Skyline",
  status: "active",
  difficulty: "easy",
  xp_reward: 50,
  points_reward: 25,
};

test("concept missions use the standard reward tiers", () => {
  const resolved = resolveMissions(missions, [], [], new Set());
  for (const item of resolved) {
    assert.notEqual(item.mode, "live");
    assert.deepEqual({ xp: item.xp, points: item.points }, { ...REWARD_TIERS[item.mission.difficulty] });
  }
  assert.deepEqual([byId(resolved, "skyline-hunter").xp, byId(resolved, "skyline-hunter").points], [300, 150]);
  assert.deepEqual([byId(resolved, "miami-circuit").xp, byId(resolved, "miami-circuit").points], [500, 300]);
});

test("a live mission shows the quest's own rewards, not the concept tier", () => {
  const skyline = byId(resolveMissions(missions, [bayfront], [], new Set()), "skyline-hunter");
  assert.equal(skyline.mode, "live");
  assert.equal(skyline.questId, "q-bayfront");
  assert.deepEqual([skyline.difficulty, skyline.xp, skyline.points], ["easy", 50, 25]);
});

test("inactive quests do not back a mission", () => {
  const skyline = byId(resolveMissions(missions, [{ ...bayfront, status: "draft" }], [], new Set()), "skyline-hunter");
  assert.equal(skyline.mode, "concept");
  assert.equal(skyline.questId, undefined);
});

test("only a completion record completes a mission, and it counts once", () => {
  const completions = [
    { quest_id: "q-bayfront", xp_awarded: 50, points_awarded: 25 },
    { quest_id: "q-bayfront", xp_awarded: 50, points_awarded: 25 },
    { quest_id: "unrelated", xp_awarded: 999, points_awarded: 999 },
  ];
  const resolved = resolveMissions(missions, [bayfront], completions, new Set(["skyline-hunter", "neon-nights"]));
  assert.equal(byId(resolved, "skyline-hunter").status, "completed");
  assert.equal(byId(resolved, "neon-nights").status, "previewed");

  const summary = summarizeCampaign(resolved);
  assert.deepEqual([summary.verified, summary.verifiedXp, summary.verifiedPoints], [1, 50, 25]);
  assert.deepEqual([summary.previewed, summary.demoXp, summary.demoPoints], [1, 50, 25]);
  assert.equal(summary.percent, 40);
});

test("a preview never produces verified XP", () => {
  const all = new Set(missions.map((m) => m.id));
  const summary = summarizeCampaign(resolveMissions(missions, [], [], all));
  assert.deepEqual([summary.verified, summary.verifiedXp, summary.verifiedPoints], [0, 0, 0]);
  assert.equal(summary.percent, 100);
});

test("the composite mission unlocks only when every required mission is done, and is never verified", () => {
  const three = new Set(["neon-nights", "concrete-canvas", "calle-ocho-chronicles"]);
  const locked = byId(resolveMissions(missions, [], [], three), "miami-circuit");
  assert.equal(locked.status, "locked");
  assert.deepEqual(locked.progress, { done: 3, total: 4 });

  const completions = [{ quest_id: "q-bayfront", xp_awarded: 50, points_awarded: 25 }];
  const open = byId(resolveMissions(missions, [bayfront], completions, three), "miami-circuit");
  assert.equal(open.mode, "composite");
  assert.equal(open.status, "previewed");
  assert.equal(open.verifiedXp, 0);
});

test("VICE stays an unofficial concept", () => {
  assert.equal(VICE_CAMPAIGN.status, "concept");
  assert.deepEqual(VICE_CAMPAIGN.partners, []);
  assert.equal(VICE_CAMPAIGN.head.noindex, true);
  assert.match(VICE_CAMPAIGN.disclosure, /Not affiliated with or endorsed by/);
  // Third-party marks appear only in the disclosure, never in page metadata.
  assert.doesNotMatch(`${VICE_CAMPAIGN.head.title} ${VICE_CAMPAIGN.head.description}`, /rockstar|take-two|gta|grand theft/i);
  assert.equal(missions.length, 5);
  for (const mission of missions) {
    for (const id of mission.requires ?? []) assert.ok(missions.some((m) => m.id === id), `${id} exists`);
    if (mission.question) assert.ok(mission.question.options.includes(mission.question.answer));
  }
});
