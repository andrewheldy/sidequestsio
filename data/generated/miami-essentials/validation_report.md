# Miami Essentials — validation & QA report

**Date:** 2026-10-24 · **Status:** seeded to an isolated local staging database only.
Production Supabase (database and Storage) has **not** been changed.

Sources (immutable): `data/imports/miami-essentials/` — the original 20-quest
planning doc and the 20-quest expansion. Dataset: `miami-essentials.csv`
(one row per concept; importer columns + editorial metadata). Images:
`hero/<slug>.webp` + `image_manifest.csv` (provenance).

## 1. Results

| Measure | Count |
|---|---|
| Quest concepts processed | 40 |
| Seeded (staging, as `draft`) | 34 |
| Ready for publication | **0** |
| Blocked (verification dependency) | 35 (34 seeded + Haulover, excluded: no sourceable coordinate) |
| Templates (need a concrete location; not seeded) | 5 — Ventanita Victory, Pastelito Passport, Hidden in Plain Sight, Same Place Two Stories, Miami Soundtrack |
| Content readiness | 40 `needs_validation` (site check, hours, duplicate-pin decision, or single-source coordinate outstanding — see `blockers`) |
| Authentic images (Wikimedia Commons) | 39 |
| AI-generated images | 0 |
| Missing / rejected | 1 missing (Wynwood Mural Chase — every candidate rejected: identifiable person, misleading subject, or dominated by copyrighted murals) |

Difficulty: 24 easy · 11 medium · 5 hard · 0 legendary (Space Survivor
demoted to hard + 21+, per the expansion). Kind: 34 evergreen · 1
event-dependent (SoundScape WALLCAST) · 5 templates.

## 2. Why nothing is publishable yet

1. **Verification (blocks all 35).** These quests need self-guided photo +
   location evidence. The live completion RPC `complete_quest()` treats
   `verification_type = 'gps'` as verified with **no location check**
   (reproduced on staging: a completion succeeded with no location at all).
   QR is not an option — no venue has authorized a sticker. The importer now
   refuses `gps` quests unless imported as draft/paused. The quest page's
   existing GPS hint ("Location is only used to verify") overstates what the
   server does.
2. **Image attribution (32 of 39 images).** 22 CC BY (2.0 ×13, 3.0 ×4,
   4.0 ×5) and 10 CC BY-SA (3.0 ×2, 4.0 ×8) require visible credit; the app
   has no image-credit display. Public domain ×4 and
   CC0 ×3 need none. BY-SA crops must stay BY-SA. `attribution_text` is ready
   in the manifest.
3. **Duplicate pins (editorial call).** 17 rows overlap existing CRM/legacy
   quests (`overlaps_existing`). Preflight against staging found 3 exact venue
   name collisions: Ball & Chain, Institute of Contemporary Art Miami, Pérez Art
   Museum Miami.
4. **Access/hours.** Hours are filled only where an official page was fetched;
   several official sites block automated checks (miami.gov, floridastateparks.org,
   pamm.org) and need a manual check.

## 3. Tests performed

| Check | Result |
|---|---|
| `npm test` — reward tiers (all four) + dataset uses the standard tier for every row | 5/5 pass; mutation (Hard → 400/200) caught |
| Typecheck · eslint (touched files) · `npm run build` | pass |
| Existing CRM import SQL after importer changes | byte-identical |
| All 23 migrations, documented order, local Postgres 16 + Supabase stubs | applied; `0023` re-run idempotent |
| Importer dry run | 34 eligible · 6 skipped · 0 errors |
| Preflight (first run) | 69 inserts · 0 updates · 3 venue-name conflicts (above) |
| Seed ×2 without images, ×2 with images | 34 quests exactly once; 2nd-pass preflight 69 updates · 0 inserts |
| Pre-existing data (partners, venues, quests, qr_codes, completions, ledger, profiles) | md5 checksums identical to baseline after all four runs |
| Seeded rows | 1 partner (`other`, `pending`), 34 venues, 34 draft quests, **0 QR codes**; rewards 19×50/25, 11×150/75, 4×300/150 |
| Draft seeded quest completion attempt | `quest_inactive` — nothing awarded |
| Generated `verify.sql` | counts match; only gap: Wynwood hero |
| Coordinate spot check (8 landmarks vs independent references) | ≤ 263 m except Shark Valley (dataset correctly uses the tower, 7 mi down the loop) and South Pointe (pier vs park) |
| Render QA — real build, Playwright, seeded rows injected (QA copy set `active`), Storage URLs served from `hero/` | see §4 |

## 4. Render QA (desktop 1280 × 900 and mobile 390 × 844)

Representative quests: easy (Domino Park Moment), medium (Walk of Fame on
Calle Ocho), hard (Oleta River Mangrove Paddle), missing image (Wynwood Mural
Chase), text-response (Art Critic for a Minute).

- All 34 titles listed exactly once in the quest browser; no duplicates.
- Detail pages: objective, XP and Points render for every tier; hero loads;
  no broken images, console errors, failed media requests or horizontal
  overflow; no QR/NFC copy.
- Card images use `loading="lazy"`; off-screen images defer until scrolled.
- Analytics events still fire (`quest_page_viewed`, `quest_viewed`,
  `quest_page_loaded`, `quest_hero_viewed`, `quest_primary_action_viewed`,
  `reward_impression`; the last two on scroll-into-view).
- **Fixed in scope:** a quest card with no image collapsed and lost its
  category and XP badges. It now shows the same branded fallback as the quest
  page hero (`src/pages/app/QuestBrowser.tsx`).
- Not covered: the map (no Mapbox token in this environment — coordinates were
  validated in data instead); the signed-in completion flow (blocked by design
  while quests are draft); a live Supabase-backed render.

Editorial notes from QA: the quest page is location-first, so `location_name`
is the large hero heading — "Wynwood mural streets (NW 2nd Ave corridor)" reads
awkwardly there. The Little Havana Starter Pack includes Ball & Chain (21+);
the expansion asks for a free-only completion path for that badge.

## 5. Collections (metadata only — no collection/achievement engine exists)

Discovery groupings and optional collections are in the `collections` column.
Start Here (12): Wynwood Mural Chase, Coconut Grove Banyan Hunt, Bayfront Park
Skyline, Metromover Sky Ride, Through the Fly's Eye, Garage or Gallery?, Art
Critic for a Minute, Under the City, Miami Before Miami, Overtown Encore,
Garden Reset, Española Way Postcard. Optional collections: Design District
Detour (3), Little Havana Starter Pack (4), Beach Not Basic (3), Miami After
the Meeting (5). **Miami Initiate** is a rule, not a list: any five eligible
completions across at least three categories, over any number of days.
Dependency: a collections/badges capability does not exist in the schema; this
seed does not add one.

## 6. Production deployment (requires explicit approval)

1. Decide the blockers in §2: a server-side location check in
   `complete_quest()` for `gps` quests (or another supported verification),
   an image-credit display, and the duplicate-pin merges.
2. Back up the database. Apply `supabase/migrations/0023_quest_media_bucket.sql`.
3. Upload `hero/*.webp` to bucket `quest-media` under `miami-essentials/`
   (dashboard or CLI, service role — never a `VITE_*` key).
4. `npm run import:crm -- data/generated/miami-essentials/miami-essentials.csv --status draft --no-qr --emit-sql out/miami-essentials.sql`
5. Run `out/miami-essentials.preflight.sql` against production; review every
   conflict row.
6. Run `out/miami-essentials.sql` in the SQL editor, then `.verify.sql`, then
   `npm run smoke:supabase`.
7. Publish quest by quest (`status = 'active'`) only after its blockers clear.
   Rollback: `out/miami-essentials.rollback.sql` (archives; non-destructive).
