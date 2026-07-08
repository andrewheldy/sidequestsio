# CRM Import Runbook — launch content pipeline

How to take a verified flat CRM workbook (the Gemini-verified Miami sheet, or any
future city's) and turn it into production partners, venues, quests and QR codes
in Supabase — validated, dry-run first, imported in dependency order, and
verifiable afterwards.

**Tool:** `scripts/import-crm.ts` (`npm run import:crm -- <csv>`)
**Template:** `scripts/templates/miami-crm.template.csv`
**Miami dataset:** source workbook `data/imports/miami/SideQuests_Venue_Database.xlsx` (immutable);
generated import input + review artifacts + validation report in `data/generated/miami/`
**Related:** `docs/QUEST_CONTENT_IMPORT.md` — the earlier, narrower tool
(`import:quests`) that updates content on *existing* quests by UUID. This
pipeline *creates* the full entity graph from a workbook. Both are idempotent
and share the same links/validation conventions.

---

## 1. What gets imported (and what never does)

One workbook row = one business location + its quest. The pipeline writes, in
dependency order:

1. **partners** — one per `business_name` (deduped across rows; two locations
   of the same business share one partner).
2. **venues** — one per location; carries address, coordinates, neighborhood,
   hours, price range.
3. **quests** — title, description, category, difficulty, XP/Points, estimated
   time, objective, hero image, and the `links` jsonb (website/reviews/socials/
   phone).
4. **qr_codes** — one active code per quest (`code` = slug uppercased,
   `destination_url` = `/q/<quest-uuid>`, matching the live convention and the
   mounted `/q/:questId` route).

**Never imported:** research/QA columns (`import_decision`,
`verification_status`, `business_status`, `verification_sources`,
`last_verified_date`, `contact_name`, `outreach_stage`, `notes`). They steer
*eligibility only* (§3) and have no production home — by design. `contact_email`
is the one CRM-ish field persisted, because `partners.contact_email` already
exists in the schema.

The full column→field mapping lives in **one object**: `MAPPING` in
`scripts/import-crm.ts`. That is the single place to change when a workbook
column is added or renamed.

## 2. Identity: slugs → deterministic UUIDs

The schema has no slug columns, so identity is derived: every entity gets a
**deterministic UUIDv5** (namespaced under `sidequests.io`) computed from the
row's `slug` (quests, QR codes), the slugified `business_name` (partners), or
business + location (venues). Consequences:

- Re-running the same file **updates** the same rows — never duplicates.
- The same slug always maps to the same quest UUID, on any machine, forever.
  **Never rename a slug after import** — that is a new identity; the old quest
  stays behind (archive it via rollback SQL if that happens).
- Slugs must be unique per file and lowercase kebab-case (`a-z`, `0-9`, `-`).

## 3. Eligibility rules (fail-safe)

Applied per row, before any validation:

| Situation | Result |
|---|---|
| `import_decision = import` | imported — unless `business_status`/`verification_status` contradict it (closed / unable_to_verify / duplicate / manual_review ⇒ **error**, not silent import) |
| `import_decision` ∈ exclude, duplicate, permanently_closed, unable_to_verify, manual_review, skip, closed | skipped (listed in the report) |
| any other non-empty `import_decision` | **error** |
| no decision, but `business_status` active-equivalent **and** `verification_status` verified-equivalent | imported |
| no decision and no verified-equivalent signal | **error** — fail-safe refusal |

Any error anywhere fails the whole run before anything is written.

## 4. Validation

- **Required:** `slug`, `business_name`, `address`, `city`, `latitude`,
  `longitude`, `quest_title` (missing header column or empty cell ⇒ error).
- **URLs** must be absolute `http(s)://`. **Coordinates** must be in range
  (positive longitude in the US ⇒ lat/lng-swap warning). **`xp_reward` /
  `points_reward`** non-negative integers. **`quest_category`** ∈ the
  `quest_category` enum (`art food outdoors culture nightlife shopping fitness
  hidden_gem`); **`difficulty`** ∈ `easy medium hard`.
- **Cross-row:** duplicate slugs ⇒ error; same venue with conflicting field
  values ⇒ error; same partner with differing values ⇒ warning (first wins).
- **Launch-quality warnings** (non-blocking): empty description, objective,
  hero image, hours, rewards.

## 5. Running an import

```bash
# 0. Prerequisites (one-time per project):
#    - supabase/migrations/0014_venue_business_profile.sql applied
#      (verified APPLIED on live 2026-07-07, evening gate audit; the emitted
#       SQL still guards for this and aborts if missing)
#    - anon grants live (0009) — verified applied on 2026-07-07

# 1. DRY RUN (default) — validates + prints the full plan; writes nothing
npm run import:crm -- content/miami.csv

# 2. Fix errors/warnings in the workbook, re-run until clean.

# 3a. Emit SQL for the Supabase SQL editor (recommended; MCP is read-only)
npm run import:crm -- content/miami.csv --emit-sql out/miami-import.sql
#     Also writes out/miami-import.verify.sql and out/miami-import.rollback.sql

# 3b. Or apply directly via PostgREST (needs SUPABASE_SERVICE_ROLE_KEY in .env;
#     never commit it, never put it in a VITE_* var)
npm run import:crm -- content/miami.csv --apply

# Optional: import everything paused for review instead of live
npm run import:crm -- content/miami.csv --status draft
```

**Safety order for the SQL-editor path:** take a database backup → review the
emitted SQL → run the import file → run the `.verify.sql` file → run
`npm run smoke:supabase` → open a few `/quests/<uuid>` and `/scan/<CODE>` URLs.

## 6. Re-import / update semantics

- Empty cell = existing DB value is left unchanged; fields are never nulled.
- `quests.links` is **merged** into the existing jsonb, never replaced.
- `status` (and partner `type`, FKs) are set **on insert only** — re-importing
  never un-pauses an entity that ops paused by hand, and never rewires an
  existing quest to a different partner/venue.
- Identical re-runs converge to the identical end state (verified: two runs
  emit byte-identical SQL modulo timestamp).

## 7. Post-import verification

The generated `<out>.verify.sql` is read-only and checks:

1. Batch row counts match the plan (partners/venues/quests/qr_codes).
2. Every imported quest's venue exists and has coordinates (0 rows expected).
3. Every quest has an active QR code with the matching `/q/<uuid>` destination.
4. Content gaps (missing objective/hero/description) for launch-quality review.
5. Venue-name collisions with pre-existing rows (catches demo-data twins).
6. Anon `SELECT` privileges on all four tables (the past 0009 blocker).

Then `npm run smoke:supabase` for end-to-end anon reads, and manual spot-checks
in the app (Quest Browser, Map, Quest Detail, `/scan/<CODE>`).

## 8. Rollback

The generated `<out>.rollback.sql` is **non-destructive**: it sets the batch's
quests and QR codes to `status = 'archived'`, which removes them from every app
surface (the app only lists `status = 'active'`). Partners and venues are left
in place — harmless while unreferenced, and possibly shared with other quests.
Re-running the import SQL re-activates nothing (status is insert-only); to
relaunch a rolled-back batch, flip the quests back to `active` explicitly.

Hard deletes are deliberately not generated. If truly required (e.g. legal
takedown), delete in reverse dependency order (qr_codes → quests → venues →
partners) after checking `quest_completions`/`scan_events` references — but
prefer archiving.

## 9. Discrepancies & decisions (workbook ↔ production schema)

Reality won over the workbook's assumptions in these places — the importer
adapts to the schema; no schema changes were made:

- **`state` / `zip` have no venue columns.** Composed into `venues.address` as
  `"street, City, ST zip"`, matching the format of the existing live rows.
- **`phone` has no venue column.** Stored as `quests.links.contact_phone` — an
  existing key in the app's `QuestLinks` type.
- **`category` (business category) has no production home.** `partners.type`
  is a coarse enum and stays `venue`. Only `quest_category` (the app enum) is
  persisted. If business categories become a product need, that's a future
  venue column.
- **`google_maps_url` is not read by the app** (the map renders from venue
  lat/lng). Accepted and ignored, so workbooks can keep it for QA.
- **`instagram_url` → `links.socials_url`** (the canonical single
  Linktree-style landing link, source inferred), and **`google_reviews_url` →
  `links.reviews_url`** + inferred `reviews_source` — per the canonical links
  shape in `docs/QUEST_CONTENT_IMPORT.md`.
- **Naming trap:** the workbook's `quest_objective` maps to the DB column
  `quests.funky_action` (it powers the "Quest Objective" card), while the
  workbook's `funky_action` maps to `quests.action_prompt` (the secondary
  playful prompt). This mirrors the established `import:quests` convention.
- **No rewards columns in the flat workbook** — the `rewards` table (reward
  redemption catalogue) is *not* populated by this pipeline. Add reward
  columns + a rewards stage when partner reward offers are finalized.

**Recommended future improvements (not done — out of scope):**

- `src/pages/app/Explore.tsx` still renders `DEMO_QUESTS`; the other app
  surfaces (Home, Quest Browser, Map, Quest Detail) already read Supabase.
  Migrate Explore to the repository when it becomes a launch surface.
- Hero/logo images are imported as external URLs. For launch durability,
  rehost them in Supabase Storage and re-import the new URLs (empty-cell
  semantics make that a safe follow-up).
- If human-readable quest URLs ever matter, add a real `slug` column +
  unique index; the importer's slugs would map onto it directly.

## 10. Asset sourcing & approval workflow (hero images + venue logos)

`data/generated/miami/quest_assets.csv` lists every missing launch asset
(62 hero images → `quests.image_url`, 62 venue logos → `venues.logo_url`).
Assets are sourced through a human-approval sheet — never scraped:

```bash
npm run assets:candidates   # writes data/generated/miami/asset_candidates.csv
```

The generator (`scripts/generate-asset-candidates.ts`) is offline and
deterministic: it joins the asset manifest with the CRM workbook and emits one
row per (asset × permission-safe sourcing lead) — the venue's own website, its
official Instagram when the workbook has one, and, for hero images only, a
royalty-free search fallback (a logo can only legitimately come from the venue
itself). It never fetches a URL, never downloads an image, and never touches
Supabase. `candidate_image_url` and `approved` start empty on every row — they
are the human reviewer's columns.

Pipeline — every step after generation is manual, by design:

1. **candidate** — `npm run assets:candidates` (re-running overwrites the
   sheet; do review work in a copy or spreadsheet, not in the generated file).
2. **manual review** — per `quest_id` + `asset_type`, pick ONE winning row:
   paste the exact image URL into `candidate_image_url` and set
   `approved=yes`. Rights gates: `venue_owned_needs_permission` rows need the
   venue's permission recorded (fold into partner onboarding);
   `license_review_required` rows need the individual photo's license checked
   for commercial use.
3. **approved → upload to Supabase Storage** — download the approved files by
   hand and upload them to a public storage bucket, then use the bucket
   public URLs (don't hotlink venue sites — URLs rot and steal their
   bandwidth). ⚠️ No quest-media bucket exists yet (live buckets `avatars`
   and `proofs` are for user content) — creating one is a small user-run
   migration/dashboard step before upload.
4. **update the import CSV** — heroes: paste storage URLs into
   `miami-crm.csv` → `hero_image_url` and re-run `import:crm` (§6 update
   semantics make this safe before or after the main import). Logos:
   `import:crm` has no logo column — apply them with the content importer
   (`npm run import:quests`) using a CSV of `quest_id,profile_image_url`
   (→ `venues.logo_url`; see `docs/QUEST_CONTENT_IMPORT.md`).

Until an asset lands, the app degrades gracefully: quest cards and the quest
hero render a category-gradient fallback and the business avatar renders
initials (`src/components/QuestImage.tsx`,
`src/components/app/quest-detail/{QuestHero,BusinessAvatar}.tsx`).
