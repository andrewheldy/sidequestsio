/**
 * import-quest-content.ts — CSV → Supabase quest/venue content importer.
 *
 * Feeds the redesigned Quest Detail page (docs/QUEST_CONTENT_IMPORT.md).
 * One CSV row per quest (template: scripts/templates/quest-content.template.csv).
 *
 * Modes (default is a DRY RUN that prints the change plan and writes nothing):
 *
 *   npx tsx scripts/import-quest-content.ts content/quests.csv
 *   npx tsx scripts/import-quest-content.ts content/quests.csv --emit-sql out/import.sql
 *   npx tsx scripts/import-quest-content.ts content/quests.csv --apply
 *
 * Semantics:
 *   - Empty cell = leave the database value unchanged (fields are never nulled).
 *   - quests.links is MERGED (existing || new), never replaced.
 *   - Idempotent: re-running the same CSV converges to the same state.
 *
 * --apply needs SUPABASE_SERVICE_ROLE_KEY (env or .env) because game tables
 * are write-protected from anon clients. Never commit that key; never ship it
 * to the browser. --emit-sql needs no credentials — paste the file into the
 * Supabase SQL editor instead.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

// --- env (same pattern as scripts/smoke-supabase.ts) -------------------------

function loadDotEnv(path = ".env"): Record<string, string> {
  try {
    const out: Record<string, string> = {};
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

const dotenv = loadDotEnv();
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? dotenv.VITE_SUPABASE_URL ?? "";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? dotenv.SUPABASE_SERVICE_ROLE_KEY ?? "";

// --- tiny RFC-4180 CSV parser -------------------------------------------------

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  // Drop fully-empty trailing rows
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

// --- CSV column contract --------------------------------------------------------

const CATEGORIES = ["art", "food", "outdoors", "culture", "nightlife", "shopping", "fitness", "hidden_gem"];
const DIFFICULTIES = ["easy", "medium", "hard"];
const REVIEW_SOURCES = ["google", "yelp", "other"];
const SOCIAL_SOURCES = ["linktree", "linkme", "other"];

/** CSV column → quests column (plain copy). */
const QUEST_COLS: Record<string, string> = {
  title: "title",
  description: "description",
  category: "category",
  difficulty: "difficulty",
  xp_reward: "xp_reward",
  points_reward: "points_reward",
  estimated_time: "estimated_time",
  quest_objective: "funky_action",
  hero_image_url: "image_url",
};

/** CSV column → quests.links key. */
const LINK_KEYS = ["website_url", "reviews_url", "reviews_source", "socials_url", "socials_source"] as const;

/** CSV column → venues column. */
const VENUE_COLS: Record<string, string> = {
  venue_name: "name",
  neighborhood: "neighborhood",
  hours: "hours",
  hours_note: "hours_note",
  price_range: "price_range",
  profile_image_url: "logo_url",
};

const URL_COLUMNS = new Set(["hero_image_url", "website_url", "reviews_url", "socials_url", "profile_image_url"]);

interface QuestPlan {
  questId: string;
  title: string; // for logging only
  quest: Record<string, string | number>;
  links: Record<string, string>;
  venue: Record<string, string>;
  warnings: string[];
}

function inferReviewSource(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("google.") || u.includes("g.page") || u.includes("maps.app")) return "google";
  if (u.includes("yelp.")) return "yelp";
  return "other";
}
function inferSocialSource(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("linktr.ee") || u.includes("linktree.")) return "linktree";
  if (u.includes("linkme")) return "linkme";
  return "other";
}

// --- row → plan ---------------------------------------------------------------

function buildPlan(header: string[], cells: string[], rowNo: number, errors: string[]): QuestPlan | null {
  const get = (col: string) => {
    const idx = header.indexOf(col);
    return idx === -1 ? "" : (cells[idx] ?? "").trim();
  };

  const questId = get("quest_id");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(questId)) {
    errors.push(`row ${rowNo}: quest_id "${questId}" is not a UUID`);
    return null;
  }

  const plan: QuestPlan = {
    questId,
    title: get("title") || questId,
    quest: {},
    links: {},
    venue: {},
    warnings: [],
  };

  for (const [csvCol, dbCol] of Object.entries(QUEST_COLS)) {
    const v = get(csvCol);
    if (!v) continue;
    if (csvCol === "category" && !CATEGORIES.includes(v)) {
      errors.push(`row ${rowNo}: category "${v}" not in ${CATEGORIES.join("|")}`);
      continue;
    }
    if (csvCol === "difficulty" && !DIFFICULTIES.includes(v)) {
      errors.push(`row ${rowNo}: difficulty "${v}" not in ${DIFFICULTIES.join("|")}`);
      continue;
    }
    if (csvCol === "xp_reward" || csvCol === "points_reward") {
      if (!/^\d+$/.test(v)) {
        errors.push(`row ${rowNo}: ${csvCol} "${v}" is not a non-negative integer`);
        continue;
      }
      plan.quest[dbCol] = Number(v);
      continue;
    }
    plan.quest[dbCol] = v;
  }

  for (const key of LINK_KEYS) {
    const v = get(key);
    if (v) plan.links[key] = v;
  }
  // Validate / infer link sources
  if (plan.links.reviews_url && !plan.links.reviews_source) {
    plan.links.reviews_source = inferReviewSource(plan.links.reviews_url);
    plan.warnings.push(`reviews_source inferred as "${plan.links.reviews_source}"`);
  }
  if (plan.links.socials_url && !plan.links.socials_source) {
    plan.links.socials_source = inferSocialSource(plan.links.socials_url);
    plan.warnings.push(`socials_source inferred as "${plan.links.socials_source}"`);
  }
  if (plan.links.reviews_source && !REVIEW_SOURCES.includes(plan.links.reviews_source)) {
    errors.push(`row ${rowNo}: reviews_source "${plan.links.reviews_source}" not in ${REVIEW_SOURCES.join("|")}`);
  }
  if (plan.links.socials_source && !SOCIAL_SOURCES.includes(plan.links.socials_source)) {
    errors.push(`row ${rowNo}: socials_source "${plan.links.socials_source}" not in ${SOCIAL_SOURCES.join("|")}`);
  }

  for (const [csvCol, dbCol] of Object.entries(VENUE_COLS)) {
    const v = get(csvCol);
    if (!v) continue;
    if (csvCol === "price_range" && !/^\${1,4}$/.test(v)) {
      plan.warnings.push(`price_range "${v}" is not $..$$$$ — stored as-is, UI shows it verbatim`);
    }
    plan.venue[dbCol] = v;
  }

  // URLs must be absolute http(s)
  for (const col of URL_COLUMNS) {
    const v = get(col);
    if (v && !/^https?:\/\//i.test(v)) {
      errors.push(`row ${rowNo}: ${col} "${v}" must start with http:// or https://`);
    }
  }

  return plan;
}

// --- SQL emission ---------------------------------------------------------------

const sq = (s: string) => `'${s.replace(/'/g, "''")}'`;

function planToSql(p: QuestPlan): string {
  const parts: string[] = [`-- ${p.title} (${p.questId})`];

  const questSets = Object.entries(p.quest).map(
    ([col, v]) => `  ${col} = ${typeof v === "number" ? v : sq(v)}`,
  );
  if (Object.keys(p.links).length > 0) {
    questSets.push(
      `  links = coalesce(links, '{}'::jsonb) || ${sq(JSON.stringify(p.links))}::jsonb`,
    );
  }
  if (questSets.length > 0) {
    parts.push(`update public.quests set\n${questSets.join(",\n")}\nwhere id = ${sq(p.questId)};`);
  }

  const venueSets = Object.entries(p.venue).map(([col, v]) => `  ${col} = ${sq(v)}`);
  if (venueSets.length > 0) {
    parts.push(
      `update public.venues set\n${venueSets.join(",\n")}\nwhere id = (select venue_id from public.quests where id = ${sq(p.questId)});`,
    );
  }

  return parts.join("\n");
}

// --- direct apply (PostgREST, service role) --------------------------------------

async function applyPlan(p: QuestPlan): Promise<string[]> {
  const notes: string[] = [];
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };

  // Current row: venue_id for the venue update + links for the client-side merge.
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/quests?id=eq.${p.questId}&select=id,venue_id,links`,
    { headers: { ...headers, Prefer: "count=exact" } },
  );
  if (!res.ok) throw new Error(`GET quest ${p.questId}: HTTP ${res.status} ${await res.text()}`);
  const rows = (await res.json()) as Array<{ id: string; venue_id: string | null; links: Record<string, unknown> | null }>;
  if (rows.length === 0) throw new Error(`quest ${p.questId} not found in Supabase`);
  const { venue_id, links: currentLinks } = rows[0];

  const questPatch: Record<string, unknown> = { ...p.quest };
  if (Object.keys(p.links).length > 0) {
    questPatch.links = { ...(currentLinks ?? {}), ...p.links };
  }
  if (Object.keys(questPatch).length > 0) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/quests?id=eq.${p.questId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(questPatch),
    });
    if (!r.ok) throw new Error(`PATCH quest ${p.questId}: HTTP ${r.status} ${await r.text()}`);
    notes.push(`quests: ${Object.keys(questPatch).join(", ")}`);
  }

  if (Object.keys(p.venue).length > 0) {
    if (!venue_id) {
      notes.push(`venues: SKIPPED (quest has no venue_id) — ${Object.keys(p.venue).join(", ")}`);
    } else {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/venues?id=eq.${venue_id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(p.venue),
      });
      if (!r.ok) throw new Error(`PATCH venue ${venue_id}: HTTP ${r.status} ${await r.text()}`);
      notes.push(`venues: ${Object.keys(p.venue).join(", ")}`);
    }
  }
  return notes;
}

// --- main -------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const emitIdx = args.indexOf("--emit-sql");
  const emitPath = emitIdx !== -1 ? args[emitIdx + 1] : null;
  const csvPath = args.find((a) => !a.startsWith("--") && a !== emitPath);

  if (!csvPath) {
    console.error(
      "Usage: npx tsx scripts/import-quest-content.ts <content.csv> [--emit-sql <out.sql>] [--apply]",
    );
    process.exit(2);
  }
  if (emitIdx !== -1 && !emitPath) {
    console.error("--emit-sql requires an output path");
    process.exit(2);
  }
  if (apply && (!SUPABASE_URL || !SERVICE_KEY)) {
    console.error(
      "--apply needs VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (env or .env).",
    );
    process.exit(2);
  }

  const rows = parseCsv(readFileSync(resolve(csvPath), "utf8"));
  if (rows.length < 2) {
    console.error("CSV has no data rows.");
    process.exit(1);
  }
  const header = rows[0].map((h) => h.trim());
  if (!header.includes("quest_id")) {
    console.error('CSV must have a "quest_id" column (see scripts/templates/quest-content.template.csv).');
    process.exit(1);
  }

  const errors: string[] = [];
  const plans: QuestPlan[] = [];
  rows.slice(1).forEach((cells, i) => {
    const plan = buildPlan(header, cells, i + 2, errors);
    if (plan) plans.push(plan);
  });

  // Report
  console.log(`\nParsed ${plans.length} quest row(s) from ${csvPath}\n`);
  for (const p of plans) {
    const nQuest = Object.keys(p.quest).length;
    const nLinks = Object.keys(p.links).length;
    const nVenue = Object.keys(p.venue).length;
    console.log(`• ${p.title}`);
    console.log(`    quests: ${nQuest ? Object.keys(p.quest).join(", ") : "(no change)"}`);
    console.log(`    links:  ${nLinks ? Object.keys(p.links).join(", ") : "(no change)"}`);
    console.log(`    venue:  ${nVenue ? Object.keys(p.venue).join(", ") : "(no change)"}`);
    for (const w of p.warnings) console.log(`    ⚠ ${w}`);
  }

  if (errors.length > 0) {
    console.error(`\n✗ ${errors.length} validation error(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    console.error("\nNothing was written. Fix the CSV and re-run.");
    process.exit(1);
  }

  if (emitPath) {
    const sql = [
      `-- Generated by scripts/import-quest-content.ts from ${csvPath}`,
      `-- ${new Date().toISOString()} — idempotent; empty CSV cells emit no SET`,
      `-- Run in the Supabase SQL editor AFTER supabase/migrations/0014_venue_business_profile.sql`,
      "begin;",
      "",
      ...plans.map(planToSql),
      "",
      "commit;",
      "",
    ].join("\n\n");
    mkdirSync(dirname(resolve(emitPath)), { recursive: true });
    writeFileSync(resolve(emitPath), sql);
    console.log(`\n✓ SQL written to ${emitPath} — review it, then paste into the Supabase SQL editor.`);
  }

  if (apply) {
    console.log("\nApplying via PostgREST (service role)…");
    for (const p of plans) {
      const notes = await applyPlan(p);
      console.log(`  ✓ ${p.title}: ${notes.join(" · ") || "no changes"}`);
    }
    console.log("\n✓ Import complete. Validate with: npm run smoke:supabase");
  }

  if (!emitPath && !apply) {
    console.log("\nDry run only — nothing written. Use --emit-sql <out.sql> or --apply.");
  }
}

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
