# Quest Content Import — Sprint 2 (Quest Detail data alignment)

Goal: populate the 9 live Supabase quests with the content the redesigned
Quest Detail page (commit `72fb929`) renders, using one CSV maintained in
Excel/Sheets. UI reads everything through the existing repository — no query
changes; missing optional fields hide gracefully.

## Verified live state (2026-07-07, read-only MCP)

- `quests` already has every quest-level column the UI needs:
  `image_url` (hero), `funky_action` (objective), `estimated_time`,
  `links jsonb`, plus `action_prompt` — i.e. migration `0012` is applied live
  (out-of-band; the migration ledger still records only `0001–0004`).
  All 9 quests have **NULL** in every content column.
- `venues` lacks business-profile fields → the only schema change this sprint
  (migration `0014_venue_business_profile.sql`, additive + idempotent).
- `partners` needs nothing (logo lives on the venue — the venue is the
  customer-facing business; partners are the B2B account shell).
- ⚠️ **Prerequisite:** `anon`/`authenticated` grants are still missing on all
  game tables (`0009_grants.sql` not applied). Until that runs, the live app
  cannot read quests at all, regardless of content.

## Canonical `quests.links` shape

```json
{
  "website_url":    "https://…",
  "reviews_url":    "https://…",
  "reviews_source": "google" | "yelp" | "other",
  "socials_url":    "https://…",        // ONE landing page (Linktree/Linkme style)
  "socials_source": "linktree" | "linkme" | "other"
}
```

Legacy keys (`google_reviews_url`, `instagram_url`, …) remain readable — the
UI prefers the canonical keys and falls back — but new content should only
use the shape above. No per-platform social keys, no menu/call/reservation.

## CSV template

`scripts/templates/quest-content.template.csv` — one row per quest,
pre-filled with current live values. Columns:

| Column | Target | Notes |
|---|---|---|
| `quest_id` | match key | UUID — **do not edit** |
| `title` | `quests.title` | |
| `description` | `quests.description` | short description under the title |
| `category` | `quests.category` | `art food outdoors culture nightlife shopping fitness hidden_gem` |
| `difficulty` | `quests.difficulty` | `easy medium hard` |
| `xp_reward` / `points_reward` | `quests.*` | integers |
| `estimated_time` | `quests.estimated_time` | free text, e.g. `30–45 min` |
| `quest_objective` | `quests.funky_action` | the "Your SideQuest" card text |
| `hero_image_url` | `quests.image_url` | large hero photo (≥800px wide) |
| `website_url` | `links.website_url` | |
| `reviews_url` / `reviews_source` | `links.reviews_*` | source inferred from URL when blank |
| `socials_url` / `socials_source` | `links.socials_*` | single landing page only |
| `venue_name` | `venues.name` | shown in the location line |
| `neighborhood` | `venues.neighborhood` | e.g. `Wynwood` |
| `hours` | `venues.hours` | e.g. `7:00 AM – 9:00 PM` |
| `hours_note` | `venues.hours_note` | e.g. `Daily` |
| `price_range` | `venues.price_range` | `$`, `$$`, `$$$`, `$$$$` |
| `profile_image_url` | `venues.logo_url` | circular avatar over the hero |

Import semantics:

- **Empty cell = leave the database value unchanged** (never nulls a field).
- `links` is **merged** into the existing jsonb (`links || new`), never replaced.
- Enum-ish columns are validated; bad values fail the row with a clear message.
- Unknown `quest_id` fails the run before anything is written.
- Idempotent: re-running the same CSV produces the same end state.

## Running the import

```bash
# 1. Dry run (default) — prints the per-quest change plan, writes nothing
npx tsx scripts/import-quest-content.ts content/quests.csv

# 2a. Emit SQL to paste into the Supabase SQL editor (matches the
#     user-applies-SQL workflow; the MCP connection is read-only)
npx tsx scripts/import-quest-content.ts content/quests.csv --emit-sql out/import.sql

# 2b. Or apply directly (requires SUPABASE_SERVICE_ROLE_KEY in env/.env —
#     never commit it, never expose it to the client)
npx tsx scripts/import-quest-content.ts content/quests.csv --apply
```

## Order of operations

1. Apply pending repo migrations in the SQL editor — at minimum
   `0009_grants.sql` (read access blocker) and the new
   `0014_venue_business_profile.sql`. Both are idempotent.
2. Fill the CSV → dry run → fix warnings → `--emit-sql` or `--apply`.
3. Validate: `npm run smoke:supabase`, then open each of the 9
   `/quests/<uuid>` URLs — every section should show real content, and
   quests left blank should hide those cards gracefully.
