/**
 * import-crm.ts — flat CRM workbook (CSV) → Supabase launch-content importer.
 *
 * Turns one verified row per business location + quest into production rows in
 * dependency order: partners → venues → quests → qr_codes. Built for the Miami
 * launch workbook but city-agnostic; see docs/CRM_IMPORT_RUNBOOK.md.
 *
 * Modes (default is a DRY RUN that validates + prints the plan, writes nothing):
 *
 *   npx tsx scripts/import-crm.ts content/miami.csv
 *   npx tsx scripts/import-crm.ts content/miami.csv --emit-sql out/miami-import.sql
 *   npx tsx scripts/import-crm.ts content/miami.csv --apply
 *   npx tsx scripts/import-crm.ts content/miami.csv --status draft   # import paused
 *
 * Identity: the schema has no slug columns, so every entity gets a
 * DETERMINISTIC UUIDv5 derived from the row's `slug` (namespaced per entity
 * type under "sidequests.io"). Re-running the same file converges to the same
 * rows — imports are idempotent upserts, never duplicates.
 *
 * Eligibility: research/QA columns (import_decision, verification_status,
 * business_status, …) are used ONLY to decide whether a row is imported. They
 * are never written to production tables. Rows without a positive signal fail
 * validation — the pipeline fails safe.
 *
 * Update semantics on re-import:
 *   - Empty cell = leave any existing database value unchanged.
 *   - quests.links is MERGED (existing || new), never replaced.
 *   - status/type are set on INSERT only — a re-import never un-pauses an
 *     entity that ops paused by hand.
 *
 * --apply needs SUPABASE_SERVICE_ROLE_KEY (env or .env). Never commit that key;
 * never ship it to the browser. --emit-sql needs no credentials — paste the
 * file into the Supabase SQL editor. --emit-sql also writes <out>.verify.sql
 * (read-only post-import checks) and <out>.rollback.sql (archives the batch).
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";

// --- env (same pattern as scripts/import-quest-content.ts) -------------------

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
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

// --- deterministic identity (UUIDv5, RFC 4122) ----------------------------------

const NS_DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function uuidv5(name: string, namespace: string): string {
  const ns = Buffer.from(namespace.replace(/-/g, ""), "hex");
  const hash = createHash("sha1").update(ns).update(name, "utf8").digest();
  const b = Buffer.from(hash.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50; // version 5
  b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** All import identities live under one fixed namespace so IDs are stable
 *  across machines, runs and future city workbooks. */
const NS_SIDEQUESTS = uuidv5("sidequests.io", NS_DNS);
const idFor = (kind: "partner" | "venue" | "quest" | "qr", key: string) =>
  uuidv5(`${kind}:${key}`, NS_SIDEQUESTS);

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining accents left by NFKD
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// --- the single CSV-column → Supabase-field mapping -------------------------------
//
// This object is the one place the workbook contract lives. `control` columns
// steer eligibility only and are NEVER persisted; `ignored` columns are
// acknowledged (no unknown-column warning) but have no app-facing home.

type Validator =
  | "url" | "int" | "latitude" | "longitude" | "category" | "difficulty"
  | "price_range" | "state" | "zip" | "email" | "phone";

interface ColumnSpec {
  target:
    | { table: "partners" | "venues" | "quests"; column: string }
    | { links: string }
    | "identity"   // slug — drives deterministic UUIDs
    | "address"    // composed into venues.address (street, City, ST zip)
    | "control"    // eligibility/QA only — never persisted
    | { ignored: string };
  required?: boolean;
  validate?: Validator;
}

const MAPPING: Record<string, ColumnSpec> = {
  // ── identity & eligibility (control plane) ──
  slug:                 { target: "identity", required: true },
  import_decision:      { target: "control" },
  verification_status:  { target: "control" },
  business_status:      { target: "control" },
  verification_sources: { target: "control" },
  last_verified_date:   { target: "control" },
  contact_name:         { target: "control" },
  outreach_stage:       { target: "control" },
  notes:                { target: "control" },

  // ── partners (B2B account shell; one per business) ──
  business_name:  { target: { table: "partners", column: "name" }, required: true },
  contact_email:  { target: { table: "partners", column: "contact_email" }, validate: "email" },

  // ── venues (the customer-facing location) ──
  location_name:  { target: { table: "venues", column: "name" } }, // falls back to business_name
  address:        { target: "address", required: true },
  city:           { target: { table: "venues", column: "city" }, required: true },
  state:          { target: "address", validate: "state" },
  zip:            { target: "address", validate: "zip" },
  neighborhood:   { target: { table: "venues", column: "neighborhood" } },
  latitude:       { target: { table: "venues", column: "latitude" }, required: true, validate: "latitude" },
  longitude:      { target: { table: "venues", column: "longitude" }, required: true, validate: "longitude" },
  hours:          { target: { table: "venues", column: "hours" } },
  hours_note:     { target: { table: "venues", column: "hours_note" } },
  price_range:    { target: { table: "venues", column: "price_range" }, validate: "price_range" },

  // ── quests ──
  quest_title:       { target: { table: "quests", column: "title" }, required: true },
  quest_description: { target: { table: "quests", column: "description" } },
  quest_category:    { target: { table: "quests", column: "category" }, validate: "category" },
  difficulty:        { target: { table: "quests", column: "difficulty" }, validate: "difficulty" },
  xp_reward:         { target: { table: "quests", column: "xp_reward" }, validate: "int" },
  points_reward:     { target: { table: "quests", column: "points_reward" }, validate: "int" },
  estimated_time:    { target: { table: "quests", column: "estimated_time" } },
  quest_objective:   { target: { table: "quests", column: "funky_action" } },  // "Quest Objective" card
  funky_action:      { target: { table: "quests", column: "action_prompt" } }, // secondary playful prompt
  hero_image_url:    { target: { table: "quests", column: "image_url" }, validate: "url" },

  // ── quests.links jsonb (canonical shape, docs/QUEST_CONTENT_IMPORT.md) ──
  website_url:        { target: { links: "website_url" }, validate: "url" },
  google_reviews_url: { target: { links: "reviews_url" }, validate: "url" },
  instagram_url:      { target: { links: "socials_url" }, validate: "url" },
  phone:              { target: { links: "contact_phone" }, validate: "phone" },

  // ── acknowledged, but no app-facing home (see runbook § discrepancies) ──
  category:        { target: { ignored: "business category — no app-facing column; partners.type stays 'venue'" } },
  google_maps_url: { target: { ignored: "not read by the app; venue lat/lng powers the map" }, validate: "url" },
};

const CATEGORIES = ["art", "food", "outdoors", "culture", "nightlife", "shopping", "fitness", "hidden_gem"];
const DIFFICULTIES = ["easy", "medium", "hard"];

// --- eligibility ------------------------------------------------------------------

const norm = (v: string) => v.trim().toLowerCase().replace(/[\s-]+/g, "_");

const EXCLUDE_DECISIONS = new Set([
  "exclude", "skip", "duplicate", "closed", "permanently_closed",
  "unable_to_verify", "manual_review",
]);
const CLOSED_BUSINESS = new Set(["permanently_closed", "closed", "temporarily_closed"]);
const BAD_VERIFICATION = new Set(["unable_to_verify", "duplicate", "manual_review", "unverified", "failed"]);
const OK_BUSINESS = new Set(["active", "open", "operating", "open_operating"]);
const OK_VERIFICATION = new Set(["verified", "confirmed", "validated"]);

type Eligibility = { kind: "import" } | { kind: "skip"; reason: string } | { kind: "error"; reason: string };

function checkEligibility(get: (col: string) => string, hasCol: (col: string) => boolean): Eligibility {
  const decision = hasCol("import_decision") ? norm(get("import_decision")) : "";
  const business = hasCol("business_status") ? norm(get("business_status")) : "";
  const verification = hasCol("verification_status") ? norm(get("verification_status")) : "";

  if (decision === "import") {
    // A positive decision must not contradict the research columns.
    if (CLOSED_BUSINESS.has(business))
      return { kind: "error", reason: `import_decision=import conflicts with business_status="${business}"` };
    if (BAD_VERIFICATION.has(verification))
      return { kind: "error", reason: `import_decision=import conflicts with verification_status="${verification}"` };
    return { kind: "import" };
  }
  if (EXCLUDE_DECISIONS.has(decision)) return { kind: "skip", reason: `import_decision="${decision}"` };
  if (decision !== "")
    return { kind: "error", reason: `unknown import_decision "${decision}" — expected import|exclude|duplicate|permanently_closed|unable_to_verify|manual_review` };

  // No decision → fail safe: require verified-equivalent research columns.
  if (CLOSED_BUSINESS.has(business)) return { kind: "skip", reason: `business_status="${business}"` };
  if (BAD_VERIFICATION.has(verification)) return { kind: "skip", reason: `verification_status="${verification}"` };
  if (OK_BUSINESS.has(business) && OK_VERIFICATION.has(verification)) return { kind: "import" };
  return {
    kind: "error",
    reason:
      "no import_decision and no verified-equivalent status " +
      `(business_status="${business || "∅"}", verification_status="${verification || "∅"}") — fail-safe refusal`,
  };
}

// --- link-source inference (same rules as import-quest-content.ts) -----------------

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

// --- row → entity plans -------------------------------------------------------------

interface EntityPlan {
  id: string;
  /** Columns provided by the CSV (insert values + on-conflict update set). */
  values: Record<string, string | number>;
  /** Columns set on INSERT only (status, type, FKs) — never updated on conflict. */
  insertOnly: Record<string, string>;
}

interface RowPlan {
  rowNo: number;
  slug: string;
  partnerId: string;
  venueId: string;
  questId: string;
  partner: EntityPlan;
  venue: EntityPlan;
  quest: EntityPlan;
  links: Record<string, string>;
  qr: { id: string; code: string; destination_url: string };
  warnings: string[];
}

interface SkippedRow { rowNo: number; slug: string; reason: string }

function validateValue(
  col: string, v: string, validator: Validator, rowNo: number,
  errors: string[], warnings: string[],
): boolean {
  switch (validator) {
    case "url":
      if (!/^https?:\/\//i.test(v)) { errors.push(`row ${rowNo}: ${col} "${v}" must start with http:// or https://`); return false; }
      return true;
    case "int":
      if (!/^\d+$/.test(v)) { errors.push(`row ${rowNo}: ${col} "${v}" is not a non-negative integer`); return false; }
      return true;
    case "latitude": {
      const n = Number(v);
      if (!Number.isFinite(n) || n < -90 || n > 90) { errors.push(`row ${rowNo}: latitude "${v}" is not in [-90, 90]`); return false; }
      return true;
    }
    case "longitude": {
      const n = Number(v);
      if (!Number.isFinite(n) || n < -180 || n > 180) { errors.push(`row ${rowNo}: longitude "${v}" is not in [-180, 180]`); return false; }
      if (n > 0) warnings.push(`longitude ${v} is positive — US venues sit in the western hemisphere; possible lat/lng swap`);
      return true;
    }
    case "category":
      if (!CATEGORIES.includes(v)) { errors.push(`row ${rowNo}: quest_category "${v}" not in ${CATEGORIES.join("|")}`); return false; }
      return true;
    case "difficulty":
      if (!DIFFICULTIES.includes(v)) { errors.push(`row ${rowNo}: difficulty "${v}" not in ${DIFFICULTIES.join("|")}`); return false; }
      return true;
    case "price_range":
      if (!/^\${1,4}$/.test(v)) warnings.push(`price_range "${v}" is not $..$$$$ — stored as-is, UI shows it verbatim`);
      return true;
    case "state":
      if (!/^[A-Za-z]{2}$/.test(v)) warnings.push(`state "${v}" is not a 2-letter code`);
      return true;
    case "zip":
      if (!/^\d{5}(-\d{4})?$/.test(v)) warnings.push(`zip "${v}" is not a 5-digit ZIP`);
      return true;
    case "email":
      if (!/^\S+@\S+\.\S+$/.test(v)) { warnings.push(`contact_email "${v}" does not look like an email — field skipped`); return false; }
      return true;
    case "phone":
      if (!/^\+?[\d\s().-]{7,}$/.test(v)) warnings.push(`phone "${v}" does not look like a phone number — stored as-is`);
      return true;
  }
}

function buildRowPlan(
  header: string[], cells: string[], rowNo: number, questStatus: string,
  errors: string[],
): RowPlan | null {
  const get = (col: string) => {
    const idx = header.indexOf(col);
    return idx === -1 ? "" : (cells[idx] ?? "").trim();
  };
  const warnings: string[] = [];

  // Required cells present?
  for (const [col, spec] of Object.entries(MAPPING)) {
    if (spec.required && header.includes(col) && get(col) === "") {
      errors.push(`row ${rowNo}: required column "${col}" is empty`);
    }
  }

  const slug = get("slug");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    errors.push(`row ${rowNo}: slug "${slug}" must be lowercase kebab-case (a-z, 0-9, single hyphens)`);
    return null;
  }

  // Identity — all deterministic from slug / business name so re-runs converge.
  const businessSlug = slugify(get("business_name"));
  if (!businessSlug) return null; // required-column error already recorded
  const venueKey = `${businessSlug}|${slugify(get("location_name")) || slugify(get("address"))}`;
  const partnerId = idFor("partner", businessSlug);
  const venueId = idFor("venue", venueKey);
  const questId = idFor("quest", slug);

  const partner: EntityPlan = {
    id: partnerId,
    values: { name: get("business_name") },
    insertOnly: { type: "venue", status: "active" },
  };
  const venue: EntityPlan = {
    id: venueId,
    values: { name: get("location_name") || get("business_name") },
    insertOnly: { partner_id: partnerId, status: "active" },
  };
  const quest: EntityPlan = {
    id: questId,
    values: {},
    insertOnly: { partner_id: partnerId, venue_id: venueId, status: questStatus },
  };
  const links: Record<string, string> = {};

  for (const [col, spec] of Object.entries(MAPPING)) {
    const v = get(col);
    if (v === "") continue;
    if (spec.validate && !validateValue(col, v, spec.validate, rowNo, errors, warnings)) continue;
    const t = spec.target;
    if (t === "identity" || t === "control" || t === "address") continue;
    if ("ignored" in t) continue;
    if ("links" in t) {
      links[t.links] = v;
      continue;
    }
    const { table, column } = t;
    const numeric = spec.validate === "int" || spec.validate === "latitude" || spec.validate === "longitude";
    const value = numeric ? Number(v) : v;
    if (table === "partners" && column !== "name") partner.values[column] = value;
    else if (table === "venues" && column !== "name") venue.values[column] = value;
    else if (table === "quests") quest.values[column] = value;
  }

  // Compose the full display address the way existing rows store it:
  // "701 S Miami Ave, Miami, FL 33131" (schema has no state/zip columns).
  const street = get("address");
  const cityStateZip = [get("city"), [get("state").toUpperCase(), get("zip")].filter(Boolean).join(" ")]
    .filter(Boolean).join(", ");
  venue.values.address = cityStateZip ? `${street}, ${cityStateZip}` : street;

  // Canonical link-source keys, inferred exactly like import-quest-content.ts.
  if (links.reviews_url) links.reviews_source = inferReviewSource(links.reviews_url);
  if (links.socials_url) links.socials_source = inferSocialSource(links.socials_url);

  // Launch-quality nudges (non-blocking).
  for (const col of ["quest_description", "quest_objective", "hero_image_url", "xp_reward", "points_reward", "hours"]) {
    if (header.includes(col) && get(col) === "") warnings.push(`${col} is empty — UI hides it, but launch content should have it`);
  }

  return {
    rowNo, slug, partnerId, venueId, questId, partner, venue, quest, links,
    qr: {
      id: idFor("qr", slug),
      code: slug.toUpperCase(),
      destination_url: `/q/${questId}`,
    },
    warnings,
  };
}

// --- cross-row merge (partners + venues are shared across rows) ---------------------

function mergeEntity(
  into: Map<string, EntityPlan>, plan: EntityPlan, label: string, rowNo: number,
  errors: string[], warnings: string[],
): void {
  const existing = into.get(plan.id);
  if (!existing) { into.set(plan.id, plan); return; }
  for (const [col, v] of Object.entries(plan.values)) {
    const prev = existing.values[col];
    if (prev === undefined || prev === "") existing.values[col] = v;
    else if (prev !== v) {
      if (label === "partner")
        warnings.push(`row ${rowNo}: partner ${col} "${v}" differs from earlier "${prev}" — first value wins`);
      else
        errors.push(`row ${rowNo}: venue ${col} "${v}" conflicts with earlier "${prev}" for the same location`);
    }
  }
}

// --- SQL emission ----------------------------------------------------------------

const sq = (s: string) => `'${s.replace(/'/g, "''")}'`;
const lit = (v: string | number) => (typeof v === "number" ? String(v) : sq(v));

/** Idempotent upsert: INSERT lists provided columns only; conflicting rows only
 *  update those same columns (insert-only columns — status/type/FKs — are left
 *  untouched so manual ops changes survive re-imports). */
function upsertSql(
  table: string, e: EntityPlan,
  opts: { linksMerge?: Record<string, string>; conflictTarget?: string } = {},
): string {
  const cols: string[] = ["id", ...Object.keys(e.insertOnly), ...Object.keys(e.values)];
  const vals: string[] = [sq(e.id), ...Object.values(e.insertOnly).map(lit), ...Object.values(e.values).map(lit)];
  const sets = Object.entries(e.values).map(([c]) => `  ${c} = excluded.${c}`);
  if (opts.linksMerge && Object.keys(opts.linksMerge).length > 0) {
    cols.push("links");
    vals.push(`${sq(JSON.stringify(opts.linksMerge))}::jsonb`);
    sets.push(`  links = coalesce(${table}.links, '{}'::jsonb) || excluded.links`);
  }
  const conflict = opts.conflictTarget ?? "id";
  const onConflict = sets.length > 0
    ? `on conflict (${conflict}) do update set\n${sets.join(",\n")}`
    : `on conflict (${conflict}) do nothing`;
  return `insert into public.${table} (${cols.join(", ")})\nvalues (${vals.join(", ")})\n${onConflict};`;
}

function emitImportSql(
  csvPath: string, partners: EntityPlan[], venues: EntityPlan[], rows: RowPlan[],
): string {
  const out: string[] = [
    `-- Generated by scripts/import-crm.ts from ${csvPath}\n-- ${new Date().toISOString()} — idempotent upserts keyed on deterministic UUIDs.\n-- Review before running in the Supabase SQL editor. Take a backup first.`,
    "begin;",
    "-- Prerequisite guard: venues business-profile columns (migration 0014).",
    `do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'venues' and column_name = 'hours'
  ) then
    raise exception 'venues profile columns missing — apply supabase/migrations/0014_venue_business_profile.sql first';
  end if;
end $$;`,
    `-- ── partners (${partners.length}) ──`,
    ...partners.map((p) => upsertSql("partners", p)),
    `-- ── venues (${venues.length}) ──`,
    ...venues.map((v) => upsertSql("venues", v)),
    `-- ── quests (${rows.length}) ──`,
    ...rows.map((r) => `-- ${r.slug}\n${upsertSql("quests", r.quest, { linksMerge: r.links })}`),
    `-- ── qr codes (${rows.length}) ──`,
    ...rows.map((r) =>
      upsertSql("qr_codes", {
        id: r.qr.id,
        values: { code: r.qr.code, destination_url: r.qr.destination_url },
        insertOnly: { quest_id: r.questId, venue_id: r.venueId, partner_id: r.partnerId, status: "active" },
      }),
    ),
    "commit;",
  ];
  return out.join("\n\n") + "\n";
}

function emitVerifySql(partners: EntityPlan[], venues: EntityPlan[], rows: RowPlan[]): string {
  const questIds = rows.map((r) => sq(r.questId)).join(", ");
  const arr = (ids: string[]) => ids.map(sq).join(", ");
  return `-- Post-import verification (read-only) — generated by scripts/import-crm.ts
-- Expected: partners=${partners.length}, venues=${venues.length}, quests=${rows.length}, qr_codes=${rows.length}

-- 1. Row counts for this batch (each count must equal the expected number above).
select
  (select count(*) from public.partners where id in (${arr(partners.map((p) => p.id))})) as partners,
  (select count(*) from public.venues   where id in (${arr(venues.map((v) => v.id))}))   as venues,
  (select count(*) from public.quests   where id in (${questIds}))                        as quests,
  (select count(*) from public.qr_codes where quest_id in (${questIds}))                  as qr_codes;

-- 2. Foreign keys resolve and every quest has a venue with coordinates (0 rows expected).
select q.id, q.title
from public.quests q
left join public.venues v on v.id = q.venue_id
where q.id in (${questIds})
  and (v.id is null or v.latitude is null or v.longitude is null);

-- 3. Every imported quest has an active QR code pointing at it (0 rows expected).
select q.id, q.title
from public.quests q
where q.id in (${questIds})
  and not exists (
    select 1 from public.qr_codes c
    where c.quest_id = q.id and c.status = 'active'
      and c.destination_url = '/q/' || q.id
  );

-- 4. Content gaps that hurt launch quality (review any rows returned).
select q.id, q.title,
       (q.funky_action is null)          as missing_objective,
       (q.image_url is null)             as missing_hero,
       (nullif(q.description, '') is null) as missing_description
from public.quests q
where q.id in (${questIds})
  and (q.funky_action is null or q.image_url is null or nullif(q.description, '') is null);

-- 5. Venue-name collisions with pre-existing rows (review — may be demo data twins).
select v.name, count(*) as rows, array_agg(v.id) as ids
from public.venues v
group by v.name having count(*) > 1;

-- 6. Anon read access (must all be true, else apply supabase/migrations/0009_grants.sql).
select
  has_table_privilege('anon', 'public.quests',   'select') as quests_readable,
  has_table_privilege('anon', 'public.venues',   'select') as venues_readable,
  has_table_privilege('anon', 'public.partners', 'select') as partners_readable,
  has_table_privilege('anon', 'public.qr_codes', 'select') as qr_codes_readable;
`;
}

function emitRollbackSql(rows: RowPlan[]): string {
  const questIds = rows.map((r) => sq(r.questId)).join(", ");
  return `-- Rollback for this import batch — generated by scripts/import-crm.ts
-- Non-destructive: archives the imported quests + QR codes so they vanish from
-- the app (which only lists status='active'). Partners/venues are left in
-- place — harmless when unreferenced, and other quests may share them.
begin;

update public.quests   set status = 'archived' where id in (${questIds});
update public.qr_codes set status = 'archived' where quest_id in (${questIds});

commit;
`;
}

// --- direct apply (PostgREST, service role) ------------------------------------------

async function rest(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path.split("?")[0]}: HTTP ${res.status} ${await res.text()}`);
  return res;
}

async function fetchExisting(table: string, ids: string[], select = "id"): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const res = await rest(`${table}?id=in.(${chunk.join(",")})&select=${select}`);
    for (const row of (await res.json()) as Array<Record<string, unknown>>) map.set(row.id as string, row);
  }
  return map;
}

/** Insert new rows / patch provided columns on existing rows (status untouched). */
async function applyEntities(
  table: string, entities: EntityPlan[],
  linksByEntity?: Map<string, Record<string, string>>,
): Promise<{ inserted: number; updated: number }> {
  const existing = await fetchExisting(table, entities.map((e) => e.id), linksByEntity ? "id,links" : "id");
  let inserted = 0;
  let updated = 0;
  for (const e of entities) {
    const links = linksByEntity?.get(e.id);
    const current = existing.get(e.id);
    if (!current) {
      const body: Record<string, unknown> = { id: e.id, ...e.insertOnly, ...e.values };
      if (links && Object.keys(links).length > 0) body.links = links;
      await rest(table, { method: "POST", body: JSON.stringify(body), headers: { Prefer: "return=minimal" } });
      inserted++;
    } else {
      const body: Record<string, unknown> = { ...e.values };
      if (links && Object.keys(links).length > 0) {
        body.links = { ...((current.links as Record<string, unknown>) ?? {}), ...links };
      }
      if (Object.keys(body).length === 0) continue;
      await rest(`${table}?id=eq.${e.id}`, { method: "PATCH", body: JSON.stringify(body), headers: { Prefer: "return=minimal" } });
      updated++;
    }
  }
  return { inserted, updated };
}

// --- main ------------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const emitIdx = args.indexOf("--emit-sql");
  const emitPath = emitIdx !== -1 ? args[emitIdx + 1] : null;
  const statusIdx = args.indexOf("--status");
  const questStatus = statusIdx !== -1 ? args[statusIdx + 1] : "active";
  const optionValues = new Set([emitPath, statusIdx !== -1 ? args[statusIdx + 1] : null]);
  const csvPath = args.find((a) => !a.startsWith("--") && !optionValues.has(a));

  if (!csvPath) {
    console.error("Usage: npx tsx scripts/import-crm.ts <crm.csv> [--emit-sql <out.sql>] [--apply] [--status active|draft]");
    process.exit(2);
  }
  if (emitIdx !== -1 && !emitPath) { console.error("--emit-sql requires an output path"); process.exit(2); }
  if (!["active", "draft", "paused"].includes(questStatus)) {
    console.error(`--status "${questStatus}" must be active, draft or paused`);
    process.exit(2);
  }
  if (apply && (!SUPABASE_URL || !SERVICE_KEY)) {
    console.error("--apply needs VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (env or .env).");
    process.exit(2);
  }

  const table = parseCsv(readFileSync(resolve(csvPath), "utf8"));
  if (table.length < 2) { console.error("CSV has no data rows."); process.exit(1); }
  const header = table[0].map((h) => h.trim().toLowerCase());

  // Header sanity: required columns must exist; unknown columns are surfaced once.
  const missing = Object.entries(MAPPING)
    .filter(([, spec]) => spec.required)
    .map(([col]) => col)
    .filter((col) => !header.includes(col));
  if (missing.length > 0) {
    console.error(`CSV is missing required column(s): ${missing.join(", ")} (see scripts/templates/miami-crm.template.csv)`);
    process.exit(1);
  }
  const unknown = header.filter((h) => !(h in MAPPING));
  if (unknown.length > 0) console.log(`⚠ Ignoring unmapped column(s): ${unknown.join(", ")}`);

  // Eligibility + row plans.
  const errors: string[] = [];
  const rows: RowPlan[] = [];
  const skipped: SkippedRow[] = [];
  const slugSeen = new Map<string, number>();
  const partners = new Map<string, EntityPlan>();
  const venues = new Map<string, EntityPlan>();

  table.slice(1).forEach((cells, i) => {
    const rowNo = i + 2;
    const get = (col: string) => {
      const idx = header.indexOf(col);
      return idx === -1 ? "" : (cells[idx] ?? "").trim();
    };
    const slug = get("slug") || `(row ${rowNo})`;

    const eligibility = checkEligibility(get, (c) => header.includes(c));
    if (eligibility.kind === "skip") { skipped.push({ rowNo, slug, reason: eligibility.reason }); return; }
    if (eligibility.kind === "error") { errors.push(`row ${rowNo} (${slug}): ${eligibility.reason}`); return; }

    const plan = buildRowPlan(header, cells, rowNo, questStatus, errors);
    if (!plan) return;

    const firstRow = slugSeen.get(plan.slug);
    if (firstRow !== undefined) {
      errors.push(`row ${rowNo}: slug "${plan.slug}" already used on row ${firstRow} — slugs must be unique`);
      return;
    }
    slugSeen.set(plan.slug, rowNo);

    mergeEntity(partners, plan.partner, "partner", rowNo, errors, plan.warnings);
    mergeEntity(venues, plan.venue, "venue", rowNo, errors, plan.warnings);
    rows.push(plan);
  });

  // Report.
  console.log(`\nParsed ${table.length - 1} row(s) from ${csvPath}`);
  console.log(`  eligible: ${rows.length} · skipped: ${skipped.length} · errors: ${errors.length}`);
  console.log(`  entities: ${partners.size} partner(s), ${venues.size} venue(s), ${rows.length} quest(s) + QR code(s)`);
  console.log(`  quest status on insert: ${questStatus}\n`);

  for (const s of skipped) console.log(`  ⏭ row ${s.rowNo} (${s.slug}) skipped — ${s.reason}`);
  if (skipped.length > 0) console.log("");

  for (const r of rows) {
    console.log(`• ${r.slug} → quest ${r.questId}`);
    console.log(`    partner: ${r.partner.values.name} (${r.partnerId})`);
    console.log(`    venue:   ${r.venue.values.name} — ${r.venue.values.address}`);
    console.log(`    quest:   ${Object.keys(r.quest.values).join(", ") || "(defaults only)"}`);
    console.log(`    links:   ${Object.keys(r.links).join(", ") || "(none)"}`);
    console.log(`    qr:      ${r.qr.code} → ${r.qr.destination_url}`);
    for (const w of r.warnings) console.log(`    ⚠ ${w}`);
  }

  if (errors.length > 0) {
    console.error(`\n✗ ${errors.length} validation error(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    console.error("\nNothing was written. Fix the workbook and re-run.");
    process.exit(1);
  }
  if (rows.length === 0) {
    console.log("\nNo eligible rows — nothing to import.");
    process.exit(0);
  }

  const partnerList = [...partners.values()];
  const venueList = [...venues.values()];

  if (emitPath) {
    const importSql = emitImportSql(csvPath, partnerList, venueList, rows);
    const base = resolve(emitPath).replace(/\.sql$/, "");
    mkdirSync(dirname(resolve(emitPath)), { recursive: true });
    writeFileSync(resolve(emitPath), importSql);
    writeFileSync(`${base}.verify.sql`, emitVerifySql(partnerList, venueList, rows));
    writeFileSync(`${base}.rollback.sql`, emitRollbackSql(rows));
    console.log(`\n✓ SQL written:`);
    console.log(`    import:   ${emitPath}`);
    console.log(`    verify:   ${base}.verify.sql`);
    console.log(`    rollback: ${base}.rollback.sql`);
    console.log("  Review the import file, back up the database, then paste it into the Supabase SQL editor.");
  }

  if (apply) {
    console.log("\nApplying via PostgREST (service role)…");
    const p = await applyEntities("partners", partnerList);
    console.log(`  ✓ partners: ${p.inserted} inserted, ${p.updated} updated`);
    const v = await applyEntities("venues", venueList);
    console.log(`  ✓ venues:   ${v.inserted} inserted, ${v.updated} updated`);
    const linksByQuest = new Map(rows.map((r) => [r.questId, r.links]));
    const q = await applyEntities("quests", rows.map((r) => r.quest), linksByQuest);
    console.log(`  ✓ quests:   ${q.inserted} inserted, ${q.updated} updated`);
    const c = await applyEntities("qr_codes", rows.map((r) => ({
      id: r.qr.id,
      values: { code: r.qr.code, destination_url: r.qr.destination_url },
      insertOnly: { quest_id: r.questId, venue_id: r.venueId, partner_id: r.partnerId, status: "active" },
    })));
    console.log(`  ✓ qr_codes: ${c.inserted} inserted, ${c.updated} updated`);
    console.log("\n✓ Import complete. Validate with npm run smoke:supabase and the generated verify SQL.");
  }

  if (!emitPath && !apply) {
    console.log("\nDry run only — nothing written. Use --emit-sql <out.sql> or --apply.");
  }
}

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
