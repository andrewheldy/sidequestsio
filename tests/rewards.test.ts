// Reward tier tests — run with `npm test` (Node's built-in test runner via tsx).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { REWARD_TIERS, REWARD_TIER_ORDER, rewardForTier } from "../src/lib/app/rewards";

test("standard reward tiers", () => {
  assert.deepEqual(REWARD_TIERS.easy, { xp: 50, points: 25 });
  assert.deepEqual(REWARD_TIERS.medium, { xp: 150, points: 75 });
  assert.deepEqual(REWARD_TIERS.hard, { xp: 300, points: 150 });
  assert.deepEqual(REWARD_TIERS.legendary, { xp: 500, points: 300 });
});

test("tiers are ordered and strictly increasing", () => {
  assert.deepEqual([...REWARD_TIER_ORDER], ["easy", "medium", "hard", "legendary"]);
  for (let i = 1; i < REWARD_TIER_ORDER.length; i++) {
    const prev = REWARD_TIERS[REWARD_TIER_ORDER[i - 1]];
    const cur = REWARD_TIERS[REWARD_TIER_ORDER[i]];
    assert.ok(cur.xp > prev.xp && cur.points > prev.points, `${REWARD_TIER_ORDER[i]} must exceed the tier below`);
  }
});

test("tiers are frozen", () => {
  assert.throws(() => {
    (REWARD_TIERS.hard as { xp: number }).xp = 400;
  });
});

test("rewardForTier returns a copy and falls back to easy", () => {
  const hard = rewardForTier("hard");
  hard.xp = 1;
  assert.equal(REWARD_TIERS.hard.xp, 300);
  assert.deepEqual(rewardForTier("unknown"), { xp: 50, points: 25 });
});

// The Miami Essentials seed dataset must use the standard tiers exactly.
const DATASET = "data/generated/miami-essentials/miami-essentials.csv";

test("Miami Essentials dataset uses the standard tier for every quest", { skip: !existsSync(DATASET) }, () => {
  const [header, ...rows] = parseCsv(readFileSync(DATASET, "utf8")).filter((r) => r.some((c) => c !== ""));
  const col = (name: string) => header.indexOf(name);
  assert.equal(rows.length, 40);
  for (const row of rows) {
    const tier = REWARD_TIERS[row[col("difficulty")] as keyof typeof REWARD_TIERS];
    assert.ok(tier, `${row[col("slug")]}: unknown difficulty "${row[col("difficulty")]}"`);
    assert.equal(Number(row[col("xp_reward")]), tier.xp, `${row[col("slug")]} XP`);
    assert.equal(Number(row[col("points_reward")]), tier.points, `${row[col("slug")]} Points`);
  }
});

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}
