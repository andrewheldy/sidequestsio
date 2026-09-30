# SideQuests Miami Master Workbook — Merge Report

Generated from the six source CSVs in this directory. Source CSVs were **not modified** —
this report and `SideQuests_Miami_Master.xlsx` are the only two generated deliverables.

- `partners.csv` (62 rows)
- `venues.csv` (62 rows)
- `quests.csv` (62 rows)
- `miami-crm.csv` (64 rows)
- `quest_assets.csv` (124 rows)
- `asset_candidates.csv` (308 rows)

---

## 1. How records were matched

| Join | Key | Result |
|---|---|---|
| `venues.partner_id` → `partners.partner_id` | UUID | 62/62 matched, 0 orphans |
| `quests.venue_id` → `venues.venue_id` | UUID | 62/62 matched, 0 orphans |
| `quests.partner_id` → `partners.partner_id` | UUID | 62/62 matched, 0 orphans |
| `quests.slug` → `miami-crm.slug` | text slug | 62/62 quests matched; **2 CRM leads have no matching quest** (see §4) |
| `quest_assets.quest_id` → `quests.quest_id` | UUID | 124/124 matched, 0 orphans (exactly 2 rows/quest: `hero_image` + `venue_logo`) |
| `asset_candidates.quest_id` → `quests.quest_id` | UUID | 308/308 matched, 0 orphans |

**In the current dataset, `partners : venues : quests` is a clean 1:1:1 relationship** — every
partner has exactly one venue and one quest. The Master Dashboard and Operations View tabs use
this to present one row per venue/quest combination. If a partner ever gains a second venue or
quest, the Partners tab's `Venue Count` column (conditional-formatted) will flag it as `2` for
review — the workbook does not assume 1:1 will always hold.

CRM `slug` is the canonical link between the raw partner-facing lead sheet and the imported
`quests`/`venues`/`partners` tables — `slug` does not exist on `partners.csv` or `venues.csv`
directly, so "Partner Linked?" / "Venue Linked?" on the CRM tab are derived from "Quest Linked?"
(see §6), which is accurate today because of the 1:1:1 structure above.

---

## 2. Duplicates found

**Zero exact duplicates.** Full integrity pass found:
- 0 duplicate `partner_id`, `venue_id`, `quest_id`, or `slug` values.
- 0 duplicate partner names (case-insensitive).
- 0 duplicate venue names.

**2 shared-address flags** (Partners tab → `Duplicate Check` column, yellow "Shared Address
(review)"): **Joia Beach Restaurant and Beach Club** and **Jungle Island** both list
`1111 Parrot Jungle Trail, Miami, FL 33132` (Watson Island). Reviewed manually — this is a
legitimate shared-complex address (both venues sit on the same island parcel), **not** a
data-entry duplicate. Flagged for visibility only; no action needed unless a future import adds a
venue at that address that isn't part of this complex.

---

## 3. Missing data

| Field | Missing | Notes |
|---|---|---|
| Business hours (`venues.hours`) | **60 / 62** | Structural gap, not a per-record error — hours were never collected during content generation. See Recommendations (§7). |
| Instagram (`quests.socials_url` / `crm.instagram_url`) | 1 quest / 2 CRM rows | `miami-circle-brickell` (Miami Circle Park) is a public historical site with no business Instagram — expected, not an error. The second CRM-level gap is one of the 2 pending leads (§4). |
| Hero images (`quest_assets`, `asset_type=hero_image`) | **62 / 62** | 0 of 62 quests have a sourced/approved hero image yet. Every quest has at least one candidate source (official website and/or Instagram) already identified in `asset_candidates.csv`. |
| Venue logos (`quest_assets`, `asset_type=venue_logo`) | **62 / 62** | Same story as hero images — sourced from official channels, none approved yet. |
| Website / Google Reviews / coordinates | 0 missing | Fully populated across all 62 imported quests. |

**Nothing in `asset_candidates.approved` is set** (308/308 blank) — no image has been through
manual rights/approval review yet. This is the single largest blocker to launch (see §5).

---

## 4. Orphaned / held-back records

**2 CRM leads were never promoted to `quests`/`venues`/`partners`** — both intentionally, per
their own `notes` field, not due to a data error:

1. **`miami-supercar-rooms`** (Miami Supercar Rooms) — a members-only venue. Conflicts with the
   product rule that a first-time visitor must be able to complete a quest without a membership.
   Needs a partner conversation about public access before it can be written up.
2. **`miami-beach-boardwalk`** (Miami Beach Boardwalk / Beachwalk) — a linear public path with no
   single street address or coordinates. The CRM notes explicitly say not to invent one; it needs
   ops to pick a specific anchor point (e.g., a named entrance) before it can be imported.

Both appear in full on the **CRM tab** (with `Quest Linked? = No`, `Needs Outreach? = Yes`) and as
extra rows on the **Operations View** tab (`Record Type = "Pending CRM Lead (not yet imported)"`,
`Launch Status = "Pending Import"`) so they stay visible to ops without polluting the
Master Dashboard's "one row per venue/quest" contract.

---

## 5. Launch readiness summary

The **Launch Readiness** and **Executive Dashboard** tabs compute all of the following live, via
formulas that read the Partners/Venues/Quests/Asset Pipeline/CRM tabs — re-running the numbers
just means editing a cell and letting Excel recalculate.

| Metric | Value |
|---|---|
| Total partners / venues / quests | 62 / 62 / 62 |
| Total CRM leads (incl. pending) | 64 |
| Verified businesses | 64 / 64 (100%) |
| Businesses needing outreach | 3 (2 pending-import leads + 1 quest missing Instagram) |
| Missing hero images / logos | 62 / 62 |
| Missing business hours | 60 / 62 |

**Overall Launch Readiness Score: ~75%** ("🟡 In Progress" band). This is a weighted average of
six equally-weighted sub-scores:

| Sub-score | Value | What's dragging it down |
|---|---|---|
| Partner completeness | 100% | — |
| Venue completeness | 52% | Business hours missing on 60/62 venues |
| Quest completeness | 100% | — |
| **Asset completeness** | **0%** | **Zero hero images/logos sourced and approved yet** |
| Verification completeness | 100% | — |
| Data integrity | 100% | 0 duplicate IDs, 0 orphaned foreign keys (verified above) |

The headline takeaway: **the content pipeline (partners, venues, quests, CRM verification) is
essentially finished and clean.** The only real blocker to launch is that no hero images or logos
have been sourced/approved yet — that alone holds the overall score to 75% instead of 90%+.

---

## 6. Design decisions worth knowing about

- **CRM tab formulas.** `Partner Linked?` and `Venue Linked?` both mirror the result of
  `Quest Linked?` (a live `COUNTIF` against the Quests tab's `slug` column) rather than running
  independent checks, because venue/partner existence is guaranteed 1:1 with a linked quest in the
  current data model (§1). `Complete?` requires business_status=active, verification_status=verified,
  and non-blank website/reviews/instagram/hero_image — since hero images are 0% sourced, `Complete?`
  correctly reads "No" for all 64 rows today; that's accurate, not a bug.
- **Asset status colors** (Green/Yellow/Orange/Red, used consistently workbook-wide) are derived
  per quest × asset type from `quest_assets.status` plus whether `asset_candidates` has an
  official-source candidate and/or an approved one: Complete (green) → Candidate Approved (yellow)
  → Needs Sourcing (orange, the status of all 124 rows today) → Missing – No Candidates (red).
- **Priority** on the Asset Pipeline tab is derived from that same severity (Critical/High/Medium/Low),
  not a separate input field — it doesn't exist in the source CSVs, so it's modeled rather than
  imported.
- **Business-hours gap excluded from "Needs Outreach."** With 60/62 venues missing hours, folding
  that into the outreach trigger would flag almost everything and drown out the two genuine leads.
  Hours are tracked separately in the Data Health / Missing Data sections instead.
- **Link display text.** URL columns show a short clickable label ("Website", "Instagram", "View on
  Map") rather than the raw URL, to keep columns readable and auto-sized. The full URL is never
  lost — it's the actual hyperlink target (click or check the Hyperlink property).
- **`COUNTIF(range,"<>")` avoided.** An earlier draft used the common `COUNTIF(range,"<>")` idiom to
  count non-blank cells. When recalculated with a Python formula-evaluation engine
  (`libreoffice`/Excel were unavailable in this environment) against the real email/URL text in this
  workbook, it returned incorrect results for ranges containing certain characters. All such formulas
  were rewritten using `COUNTA`/`COUNTBLANK`/`SUMPRODUCT` with direct comparisons instead, and every
  formula in the workbook (10,869 cells across all 9 tabs) was re-verified to compute the expected
  value before this report was written.

---

## 7. Recommendations

1. **Prioritize hero image + logo sourcing.** This is the single biggest lever on the readiness
   score (0% → moving it to even 50% would push overall readiness past 85%). The Asset Pipeline tab
   is sorted by priority and already lists a suggested source (official website or Instagram) for
   every one of the 124 slots — no research needed, just review/approve/upload.
2. **Resolve the 2 pending CRM leads** with a short ops decision: (a) a partner conversation with
   Miami Supercar Rooms about public-access terms, and (b) picking a specific Beachwalk entrance as
   the quest anchor point. Both are one conversation away from being importable.
3. **Business hours are a known, deliberate gap** (60/62 venues) — not a data-entry miss. Decide
   whether to backfill from Google/venue websites in a batch pass, or accept the gap for MVP launch
   (hours are "nice to have" context, not required for the QR-scan quest loop).
4. **Miami Circle Park's missing Instagram/socials is expected** (it's a public city park, not a
   business) — no action needed; it's flagged only so it doesn't get missed in a bulk "missing
   socials" outreach sweep.
5. **Re-run the Launch Readiness/Executive Dashboard tabs after any bulk data change** — every
   number on those two tabs is a live formula against the other seven tabs, so editing e.g. the
   Asset Pipeline's `Current Status` column will immediately move the Asset Completeness % and the
   Overall Readiness gauge.
