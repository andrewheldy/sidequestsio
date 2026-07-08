# CLAUDE.md — SideQuests.io Operating Manual

This is the entry point for Claude Code sessions working on SideQuests.io. It is an **operating
manual**, not a spec: it tells you what to read (and when), which source wins in a conflict, the
hard guardrails of this repo, and what "done well" looks like. It **points to** the authoritative
documents rather than duplicating them — always read the linked source before relying on a summary
here.

---

## 1. What SideQuests is

SideQuests is a curated, mobile-first platform that turns real-world exploration into a game: users
discover **quests** at partner venues, verify physical presence by scanning a **QR code**, complete a
short objective, capture the moment, and earn **XP** (long-term progression, non-spendable) and
**Points** (the spendable reward currency). It is a B2B2C product — consumers use it free; partner
businesses get a profile, quests, and analytics. **Miami is the current validation market.** The
system is a **Vite + React 18 + TypeScript single-page app** that talks directly to **Supabase**
(Postgres + Auth + Storage + RPC) from the browser and deploys as a static build on **Vercel** —
there is no separate backend server.

---

## 2. Documentation reading layers

Do **not** read every document every session. Read Layer 1 always; pull Layer 2 by the kind of work
you're doing.

### Layer 1 — Always read (before any meaningful work)
- [`docs/PROJECT_CONSTITUTION.md`](docs/PROJECT_CONSTITUTION.md) — foundational principles.
- [`docs/MASTER_CONTEXT.md`](docs/MASTER_CONTEXT.md) — product vision, MVP scope, user journey.
- [`docs/engineering/SYSTEM_STATE.md`](docs/enginerring/SYSTEM_STATE.md) — the verified current state of the deployed system.

### Layer 2 — Read when relevant
**Product work**
- [`docs/product/PRODUCT_SPEC.md`](docs/product/PRODUCT_SPEC.md) — authoritative MVP feature set.
- [`docs/product/DESIGN_SYSTEM.md`](docs/product/DESIGN_SYSTEM.md) — visual identity, UX philosophy.
- [`docs/product/QUEST_DESIGN_GUIDE.md`](docs/product/QUEST_DESIGN_GUIDE.md) — how to design good quests.
- [`docs/product/PRODUCT_DECISION_LOG.md`](docs/product/PRODUCT_DECISION_LOG.md) — product decisions & reasoning.
- [`docs/PRODUCT_DIRECTION.md`](docs/PRODUCT_DIRECTION.md) — current product strategy.

**Engineering work**
- [`docs/architecture/TECHNICAL_ARCHITECTURE.md`](docs/architecture/TECHNICAL_ARCHITECTURE.md) — architecture & stack.
- [`docs/architecture/DATABASE_SPEC.md`](docs/architecture/DATABASE_SPEC.md) — logical data model.
- [`docs/engineering/ENGINEERING_STANDARDS.md`](docs/engineering/ENGINEERING_STANDARDS.md) — coding standards.
- [`docs/engineering/DEVELOPMENT_ROADMAP.md`](docs/engineering/DEVELOPMENT_ROADMAP.md) — current engineering priorities.

**Business / partnerships**
- [`docs/business/BUSINESS_MODEL.md`](docs/business/BUSINESS_MODEL.md)
- [`docs/business/PARTNERSHIP_PLAYBOOK.md`](docs/business/PARTNERSHIP_PLAYBOOK.md)
- [`docs/engineering/ANALYTICS_SPEC.md`](docs/engineering/ANALYTICS_SPEC.md)

**Operational / current work**
- [`docs/engineering/PRODUCTION_SPRINT_PLAN.md`](docs/engineering/PRODUCTION_SPRINT_PLAN.md) — evidence-tagged execution plan.
- [`docs/QUEST_CONTENT_IMPORT.md`](docs/QUEST_CONTENT_IMPORT.md) — quest content import workflow.
- [`docs/engineering/ROADMAP.md`](docs/engineering/ROADMAP.md) — planned work (if still current).
- [`docs/engineering/CHANGELOG.md`](docs/engineering/CHANGELOG.md) — notable operational & code changes.
- [`docs/legal/`](docs/legal/) — canonical source for all legal/policy documents, rendered live at
  `/privacy`, `/terms`, `/community-guidelines`, `/cookies`, `/delete-account`, `/partner-terms`;
  see `docs/legal/README.md` for the versioning/rendering/consent-mapping process.

**Historical / decision context**
- [`docs/architecture/ARCHITECTURE_DECISION_RECORD.md`](docs/architecture/ARCHITECTURE_DECISION_RECORD.md)
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — append-only standing decisions.
- [`docs/audits/`](docs/audits/) — historical audit evidence; **do not rewrite these**.

---

## 3. Source-of-truth hierarchy (precedence of truth)

When two sources disagree about **what the system actually is**, resolve in this order of authority:

1. **Current codebase (`src/`) and current `supabase/migrations/`** — implementation reality.
2. **`docs/SYSTEM_STATE.md`** — the verified current state.
3. **`docs/PROJECT_CONSTITUTION.md`** — long-term philosophy.
4. **`docs/MASTER_CONTEXT.md`** — product vision and intended behavior.
5. **Product / business / architecture / engineering docs** — implementation guidance.
6. **Audit docs (`docs/audits/*`)** — historical evidence; **never silently rewritten**.
7. **Legacy docs (e.g. root `ARCHITECTURE.md`)** — historical context only, unless explicitly
   revalidated against `docs/SYSTEM_STATE.md`, `src/App.tsx`, and `supabase/migrations/`.

> **Core rule: never assume documentation is correct. Verify it against the implementation before
> making code changes.**

- `docs/engineering/DEVELOPMENT_ROADMAP.md` is the reference for *current engineering priorities* —
  that is a separate question from the truth ordering above, which governs conflicts about what the
  system *is*.
- Root **`ARCHITECTURE.md`** is a **legacy MVP snapshot**, not the current source of truth. A *future*
  cleanup (do **not** do this now unless asked) is to move it to
  `docs/architecture/legacy/ARCHITECTURE_OLD_MVP_BUILD.md`, or merge its still-accurate parts into
  `docs/architecture/TECHNICAL_ARCHITECTURE.md`.

---

## 4. Product principles

Every feature should strengthen at least one pillar (see `PROJECT_CONSTITUTION.md`):
real-world exploration · player enjoyment · partner business value · community knowledge ·
product simplicity · long-term trust.

**Curation over quantity.** The goal is the most *memorable* quests, not the most quests — quest
quality outranks quest quantity. If a feature exists only because it is technically possible, it
probably should not exist.

### Current Company Stage

SideQuests is currently validating product-market fit in Miami.

Current priorities are:

- Build a polished consumer experience.
- Launch high-quality curated quests.
- Demonstrate measurable ROI for partner businesses.
- Increase repeat engagement.
- Learn from real users before expanding geographically or adding major product capabilities.

Avoid designing for national scale until the local model has been validated.
---

## 5. Engineering principles

See `ENGINEERING_STANDARDS.md` and `TECHNICAL_ARCHITECTURE.md` for the full text. In practice:

- **Build the simplest thing that works.** Solve today's problem; avoid speculative abstractions.
- **Readability first.** Small functions, descriptive names, explicit logic. Consistency > cleverness.
- **One source of truth per datum.** Avoid duplicated state and duplicate data models.
- **Repository pattern.** UI/data access goes through the repository (`src/lib/db/`,
  `src/lib/db/repository.ts`) — `SupabaseRepository`, `LocalRepository` (real fallback), and
  dev-only `MockRepository`. Don't scatter raw queries through components.
- **Security is enforced on the server, never the client.** Validate identity, ownership, and
  completion/redemption in Postgres via **RLS + PostgREST grants + RPCs**. Assume client input is
  hostile. Integrity-sensitive writes (points, completions, redemptions) go through RPCs.
- **Mobile-first performance.** Small payloads, fast rendering, efficient images.

**Reality caveats — verify, don't assume:**
- TypeScript runs **non-strict** (`tsconfig.app.json`: `strict: false`) — a passing typecheck is
  weaker than strict-mode would be.
- There is **no automated test suite**. CI (`.github/workflows/ci.yml`) runs install + typecheck +
  build only. Verify changes by running the affected flow, not by trusting tests that don't exist.
- **Lint may not be clean** repo-wide — keep the files you touch clean; don't scope-creep a lint sweep.
- The repo is organized **by type** (`src/components`, `src/pages`, `src/lib`, `src/hooks`), **not**
  the `features/` layout the spec docs describe. **Match the existing structure**; don't restructure.

### AI Working Philosophy

When working on SideQuests:

- Ask for clarification rather than making assumptions when requirements are ambiguous.
- Prefer modifying existing code over rewriting working systems.
- Prefer updating an existing document instead of creating a new one.
- Explain tradeoffs when multiple reasonable solutions exist.
- Optimize for the current stage of the company, not hypothetical future scale.
- Keep changes small, auditable, and consistent with the existing architecture.
- Avoid introducing new abstractions unless they clearly reduce complexity.
- Leave the repository cleaner than you found it without expanding the scope of the task.
---

## 6. MVP scope guardrails

The product is the core loop:

**Discover → Visit → Scan → Complete → Capture → Progress → Share → Note → Return**

The MVP surface (per `MASTER_CONTEXT.md`): quest discovery, QR verification, quest pages, quest
completion, XP progression, spendable Points, Adventure Log, Community Notes, business profiles,
partner analytics, and the reward-redemption foundation. Release criteria live in
`DEVELOPMENT_ROADMAP.md`.

**Anything not in the documented MVP is out of scope until it is formally added to the spec.** When in
doubt, favor polishing the existing loop over adding surface area.

### MVP Success Criteria

The MVP is considered successful when:

- A new user can discover a real quest.
- They can travel to a partner venue.
- Scan the QR code.
- Complete the quest.
- Earn XP and Points.
- Capture the moment.
- Leave a Community Note.
- Redeem an available reward.
- Return to discover and complete another quest.

At the same time, the partner business can measure meaningful engagement through analytics and perceive clear business value from participating in the platform.

Until this loop is validated with real users and partners in Miami, prioritize improving the existing experience over expanding the product surface area.
---

## 7. What not to build

- **No open user-generated quest publishing.** SideQuests is a **curated** platform.
- **Community Guides / creators collaborate** with SideQuests on curated quest lines — they do **not**
  independently publish quests. Creators are a go-to-market channel, not the core product.
- **No crypto, Web3, token, blockchain, NFT, or Solana** anything. This is a real-world exploration
  product; Points are an in-app reward currency, not a financial instrument.
- **No speculative features** outside the documented MVP. See `PRODUCT_SPEC.md` → "Out of Scope" and
  `DEVELOPMENT_ROADMAP.md` → "Phase 4 — Future Exploration" for what is explicitly deferred.
- **No new dependencies or large rewrites** without an explicit task. Prefer small, auditable changes.

---

## 8. How to handle conflicting docs

- **Docs disagree with code → investigate before changing anything.** Code + migrations are the top of
  the truth hierarchy (§3).
- **Strategy/product docs disagree with `SYSTEM_STATE.md` →** prefer `SYSTEM_STATE.md` for *current
  reality*.
- **Architecture docs disagree with `supabase/migrations/` or `src/App.tsx` →** prefer the current
  code/migrations and **flag the doc as stale** (note it; don't silently "fix" the system to match a
  doc).
- **"Missing migration/columns" language:** the migration **SQL files exist** in the repo (e.g.
  `supabase/migrations/0012_quest_fable_fields.sql`, `0013_proofs_bucket.sql`,
  `0014_venue_business_profile.sql`). When roadmap/audit text reads "missing," interpret it as
  **"live production state must be verified/applied,"** not "the files are missing." Verify what is
  actually applied on the live database before acting.
- **Always surface a conflict** to the user; never silently pick a side.

---

## 9. Supabase and migration rules

Project ref `wvedvngtuzsttpavmgjw`. Postgres + Auth + Storage + RPC via Supabase is the entire
backend; the browser talks to it directly.

- **The Supabase MCP is read-only** (`.mcp.json`). Claude **cannot** apply migrations or run imports.
  Author them and hand them to the user to run in the **SQL editor / CLI after a backup**.
- **New migrations** are the next `NNNN_name.sql` in `supabase/migrations/` and must be
  **idempotent, non-destructive, reversible where practical, and commented** with intent.
- **The applied-migration ledger has drifted** (some migrations were applied out-of-band, and the
  ledger may record fewer than exist). **Verify live state** before relying on schema facts — use the
  read-only Supabase MCP plus:
  - `scripts/verify-db.sql` — read-only reality gate (grants, triggers, backfills, buckets, columns).
  - `npm run smoke:supabase` — anon-read + ledger smoke test.
- **Grants ≠ RLS.** Public reads need both an RLS policy *and* a PostgREST grant. A missing grant is a
  known past blocker even when RLS is correct.
- **Never** put a `service_role` key in a `VITE_*` variable — those ship to the browser.
- **Quest content import:** `npm run import:quests -- <csv>` (dry-run by default; `--emit-sql` for the
  SQL-editor workflow; `--apply` requires `SUPABASE_SERVICE_ROLE_KEY`). See
  `docs/QUEST_CONTENT_IMPORT.md`; the canonical `quests.links` shape and the 9 live quest IDs are
  documented there and in `supabase/import_mapping.json`.
- **Env vars** (all marked *Sensitive* in Vercel; preview shares the production Supabase project):
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MAPBOX_PUBLIC_TOKEN`.

---

## 10. Documentation update policy

- **One authoritative document per topic.** Update that document; do not copy the same fact into
  several files.
- **Update docs when implementation intentionally changes.** Map the change to its owner:
  - System/deployment reality → `docs/engineering/SYSTEM_STATE.md`
  - Notable change (code or ops) → `docs/engineering/CHANGELOG.md`
  - A standing decision → `docs/DECISIONS.md` (append-only), or `PRODUCT_DECISION_LOG.md` /
    `ARCHITECTURE_DECISION_RECORD.md` for product/architecture decisions
  - Scope or priority shift → the roadmap
- **Dated snapshots stay dated** — add a new entry rather than silently editing history.
- **Audit files (`docs/audits/*`) are historical evidence — never rewrite them.**

---

## 11. Definition of a successful Claude Code session

A session is successful when:

- The change is **scoped, small, and auditable**, and matches existing conventions.
- **No application code or migrations were modified unless that was the task**; no new dependencies, no
  destructive commands, no large rewrites.
- Security is **enforced server-side**; any migration is authored **idempotently** and left for the
  user to apply (read-only MCP).
- The change is **verified against reality** — typecheck (`npx tsc -p tsconfig.app.json --noEmit`) +
  build, plus the relevant `scripts/verify-db.sql` / `npm run smoke:supabase` or driving the actual
  flow — not just asserted.
- The **one authoritative doc** was updated if implementation intentionally changed.
- **No out-of-scope, crypto, or legacy patterns** were reintroduced.
- Any **conflict was surfaced**, not silently resolved.

---

## Quick reference

- **Package manager:** `npm` (matches `README.md` and CI). A `bun.lockb` also exists, but npm is
  canonical for this repo.
- **Commands:** `npm run dev` · `npm run build` · `npm run lint` ·
  `npx tsc -p tsconfig.app.json --noEmit` (typecheck) · `npm run smoke:supabase` ·
  `npm run import:quests -- <csv>`
- **Stack:** Vite + React 18 + TypeScript · React Router v6 · TanStack Query v5 · Tailwind + shadcn/ui ·
  Mapbox GL JS · Supabase · Vercel.
- **Key paths:**
  - `src/App.tsx` — the authoritative mounted route map.
  - `src/lib/db/` — the Repository layer (`repository.ts`, `index.ts`, `supabase/`, `local/`, `mock/`).
  - `src/lib/quests.ts` — static quest catalogue (`Quest`) vs. `src/types/db.ts` — the Supabase shape
    (`QuestWithContext`); these are two parallel models — check which a surface uses.
  - `supabase/migrations/` — database truth · `scripts/` — verify/smoke/import tooling.
