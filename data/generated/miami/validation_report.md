# Miami Launch Dataset — Validation Report

**Generated:** 2026-07-07
**Source of truth:** `data/imports/miami/SideQuests_Venue_Database.xlsx` (immutable, untouched)
**Source sha256:** `7848b68b99af99578a8f4498812729674f630d3683da3b80aa6d94022b259520`
**Import pipeline:** `npm run import:crm -- data/generated/miami/miami-crm.csv` (see `docs/CRM_IMPORT_RUNBOOK.md`)

> Note: the workbook arrived at `data/imports/SideQuests_Venue_Database.xlsx` and was **moved**
> (not modified) to the canonical `data/imports/miami/` path. Checksum above is post-move.

---

## 1. Workbook accounting

| Sheet | Rows | Disposition |
|---|---|---|
| `verified_miami_venues` | 64 | 62 marked `import`, 2 marked `manual_review` (below) |
| `closed_or_excluded` | 9 | Not processed — all `permanently_closed`, quarantined by the researcher |
| `manual_review` | 27 | Not processed — `needs_manual_review`, no verified-status signal (importer would fail-safe refuse them) |

Only `verified_miami_venues` (all rows `business_status=active`, `verification_status=verified`)
feeds the generated artifacts.

### Rows held back (`import_decision=manual_review`)

| Row | Venue | Reason |
|---|---|---|
| 53 | Miami Supercar Rooms | Workbook describes it as **members-only** — conflicts with the quest rule that a first-time visitor must be able to complete the quest. Needs a partner conversation about public access before content is written. |
| 60 | Miami Beach Boardwalk (Beachwalk) | No street address or coordinates; the workbook's own note says **"do not invent one."** A linear path needs an ops-chosen anchor point (e.g. a specific entrance) before import. |

Both rows are present in `miami-crm.csv` with empty quest fields; the importer skips them
(verified in the dry run) and they cannot be imported accidentally.

## 2. Generated artifacts (this directory)

| File | Rows | Purpose |
|---|---|---|
| `miami-crm.csv` | 64 | **The import input** — flat CSV consumed by `npm run import:crm` |
| `partners.csv` | 62 | Entity view: one partner per business (deterministic UUIDv5) |
| `venues.csv` | 62 | Entity view: locations w/ composed address, coordinates + `coordinate_source` provenance |
| `quests.csv` | 62 | Entity view: full quest content, links, QR code + destination |
| `quest_assets.csv` | 124 | Asset gap manifest: hero image + venue logo per quest, all `missing` |

The UUIDs in the entity CSVs were verified identical to the ones the importer derives
(same UUIDv5 namespace/slug scheme) — e.g. `panther-coffee-wynwood` →
`1194aef9-bc2f-5cc8-bbd9-e0c7a9e3e067` in both `quests.csv` and the dry-run plan.
The entity CSVs are **review artifacts**; the import itself runs from `miami-crm.csv` so that
eligibility, validation and idempotent-upsert semantics all come from the one audited pipeline.

## 3. Quest content standards applied

Content was written against `docs/product/QUEST_DESIGN_GUIDE.md`, `docs/MASTER_CONTEXT.md`
and `docs/PROJECT_CONSTITUTION.md`:

- **Verified facts only.** Every venue-specific claim in a title/description/objective traces to
  the workbook (names, neighborhoods, `notes`). Venues whose concept the workbook does not
  establish (e.g. Midorie, Under the Mango Tree, Dasher & Crank) received observation/discovery
  objectives that assert nothing unverifiable.
- **No purchases required, no mandatory staff interaction, nothing that disrupts operations.**
  Objectives are find/observe/photograph/explore; playful `funky_action` prompts are optional
  and self-contained.
- **Reward tiers exactly per the design guide:** easy = 50 XP / 25 Points (30 quests),
  medium = 150 XP / 75 Points (32 quests). No hard/legendary quests in the launch set; target
  times all fall in the requested 5–20 minute band.
- **Categories** (DB enum): food 18 · nightlife 11 · art 9 · culture 8 · outdoors 7 ·
  shopping 5 · hidden_gem 3 · fitness 1.
- **Machine checks passed:** unique slugs (kebab-case), unique titles, descriptions < 100 words,
  valid category/difficulty enums, tier-consistent rewards, absolute URLs, coordinates inside
  the Miami bounding box, all longitudes negative (no lat/lng swaps).

## 4. Data-quality findings

### Coordinates (was the largest gap: 35/64 rows had none)

| Source | Venues | Notes |
|---|---|---|
| Workbook (verified) | 29 | Used as-is |
| Geocoded — high confidence | 28 | Nominatim structured street-address match (same engine as `scripts/geocode-miami-crm.ts`) |
| Geocoded — medium confidence | 5 | Place-name fallback — **spot-check these on the map before launch** |

Medium-confidence five: The Corner (25.784656, −80.193897) · Sugar Rooftop at EAST
(25.766606, −80.192870 — agrees with Tea Room's structured match in the same building) ·
Lummus Park (25.780613, −80.129893) · Miracle Mile (25.749713, −80.255427) ·
Giralda Plaza (25.751487, −80.257063). Per-venue provenance is in `venues.csv`
(`coordinate_source` column — not a DB column; the importer ignores it).

### Fields empty across the whole workbook (nothing fabricated to fill them)

- `hours` / `price_range` / `business_phone` / `category` / `google_maps_url` /
  `facebook_url` / `tiktok_url` — all 64 rows empty. Hours were populated **only** for the five
  venues whose workbook notes state them (Wynwood Walls, E11EVEN, Tea Room, Jungle Island,
  Bodega Taqueria). Empty cells are safe: import semantics never null a DB value.
- **Hero images & venue logos: none exist.** `quest_assets.csv` lists all 124 needed assets
  with the venue's own verified website/Instagram as the sourcing lead. This is the biggest
  launch-quality gap — the dry run flags it on every quest (expected).
- Miami Circle has no socials URL (it's a state archaeological site) — link section will
  show website + reviews only.

### Venue-level caveats for ops review

- **E11EVEN** — 21+ only (noted in description and `hours_note`).
- **Tea Room at EAST** — open Thu–Sat only; the objective says so explicitly.
- **The Temple House** — private event venue; quest is exterior/sidewalk-only by design.
- **The Standard Spa** — adults-only property; quest ends at the entrance.
- **Ticketed/admission venues** (Wynwood Walls, PAMM, Superblue, Rubell, The Bass, Jungle
  Island, Fairchild, The Kampong): quests assume the player is visiting anyway; QR placement
  should be agreed with the partner (inside vs. entrance) during onboarding.
- **Public spaces** (Lummus Park, Ferré Park, Española Way, Miracle Mile, Giralda Plaza,
  Government Center, Kaseya plaza, Miami Circle): the "partner" row is a placeholder shell —
  fine for the data model, but there is no commercial decision-maker to co-sign the quest.

## 5. Dry-run result (2026-07-07)

```
Parsed 64 row(s) from data/generated/miami/miami-crm.csv
  eligible: 62 · skipped: 2 · errors: 0
  entities: 62 partner(s), 62 venue(s), 62 quest(s) + QR code(s)
  quest status on insert: active
  ⏭ row 53 (miami-supercar-rooms) skipped — import_decision="manual_review"
  ⏭ row 60 (miami-beach-boardwalk) skipped — import_decision="manual_review"
```

122 warnings, all of exactly two expected classes: `hero_image_url is empty` (62) and
`hours is empty` (60). **Nothing was written to Supabase.**

## 6. Production import gate — NOT yet run

The import is intentionally held behind these steps, in order:

1. **Apply `supabase/migrations/0014_venue_business_profile.sql`** — verified not yet applied
   live as of 2026-07-07; the emitted SQL guards for it and aborts if missing. (`0009_grants`
   is verified applied.)
2. Human review of this report + spot-check of `quests.csv` content and the 5 medium-confidence
   coordinates.
3. Database backup.
4. `npm run import:crm -- data/generated/miami/miami-crm.csv --emit-sql out/miami-import.sql`
   → review the SQL → run in the Supabase SQL editor (MCP is read-only by design).
   Consider `--status draft` for a paused launch-review import instead of `active`.
5. Run the generated `out/miami-import.verify.sql`, then `npm run smoke:supabase`, then open a
   few `/quests/<uuid>` and `/scan/<CODE>` URLs.
6. Rollback if needed: generated `out/miami-import.rollback.sql` archives the batch
   (non-destructive).

**Explicit approval is required before step 4.** Nothing in this generation run touched the
database; the Supabase MCP connection remains read-only.
