# SideQuests.io — App Architecture & MVP Build

> Real-world discovery platform. Users complete quests by scanning QR codes,
> tapping NFC tags, or checking in at venues; they earn XP & points, unlock
> rewards, climb leaderboards, and leave Community Notes. Partners create quests,
> generate QR codes, and view privacy-safe analytics.

This document is the map for the functional MVP that was added **on top of the
existing marketing landing page without changing it**.

---

## 1. Recommended Architecture

The existing project is a **Vite + React 18 + TypeScript SPA** (Lovable-generated)
using React Router v6, shadcn-ui, Tailwind, and TanStack Query — **not** Next.js.
Rather than rewrite into Next.js (which would risk the marketing site and the
Lovable workflow), the MVP keeps the proven stack and adds a backend the SPA can
talk to directly:

```
┌─────────────────────────────────────────────────────────────┐
│  React SPA (Vite)                                            │
│                                                             │
│  Marketing site  │  Functional app (/app, /partner, /admin) │
│  (untouched)     │                                          │
│                  │   UI ──▶ Repository interface ──▶ ┐       │
│                  │   (TanStack Query)                │       │
└──────────────────┴───────────────────────────────────┼──────┘
                                                        │
                       ┌────────────────────────────────┴───────┐
                       ▼                                         ▼
            LocalRepository (default)             SupabaseRepository (prod)
            localStorage + seed data              Postgres + Auth + RLS + RPCs
            — runs with zero backend —            — set 2 env vars to enable —
```

### The key decision: a Repository abstraction

Everything in the UI talks to a single backend-agnostic
[`Repository`](src/lib/db/repository.ts) interface. Two implementations satisfy it:

- **`LocalRepository`** (`src/lib/db/local/`) — a fully functional, in-browser
  backend backed by `localStorage`, seeded with realistic Miami demo data. It
  contains the real MVP business logic (immutable ledger, completion guards,
  inventory decrements, leaderboard + analytics computation). **This is what runs
  out of the box — no credentials, no network.**
- **`SupabaseRepository`** (`src/lib/db/supabase/`) — the production backend.
  Reads map onto tables (guarded by RLS); atomic mutations call Postgres RPCs.
  Activated automatically when `VITE_SUPABASE_URL` is set; it is even code-split
  into its own bundle so it's never loaded otherwise.

[`getRepository()`](src/lib/db/index.ts) picks the right one. **Not a single
call-site changes between the two modes.** This is what makes the MVP both
*immediately functional* and *production-ready*.

| Concern        | Choice                                            |
| -------------- | ------------------------------------------------- |
| Frontend       | Vite + React + TypeScript (existing)              |
| Routing        | React Router v6 (existing)                         |
| Data fetching  | TanStack Query (existing)                          |
| Backend (prod) | Supabase (Postgres, Auth, RLS, RPC)               |
| Backend (dev)  | LocalRepository (localStorage)                    |
| Styling        | Tailwind + shadcn-ui design tokens (existing)     |
| Mobile-first   | `AppLayout` shell + bottom nav (matches mockup)   |

---

## 2. Database Schema

Full schema lives in [`supabase/migrations/0001_schema.sql`](supabase/migrations/0001_schema.sql)
and is mirrored 1:1 as TypeScript in [`src/types/db.ts`](src/types/db.ts).

**Tables:** `users`, `user_profiles`, `privacy_preferences`, `partners`,
`venues`, `quests`, `qr_codes`, `scan_events`, `quest_attempts`,
`quest_completions`, `community_notes`, `points_ledger`, `rewards`,
`reward_redemptions`, `leaderboard_snapshots`, `analytics_rollups`,
`consent_events`, `audit_logs`.

Highlights:
- **`points_ledger` is append-only** and is the source of truth for points & XP.
  `user_profiles.points_balance_cache` is a denormalized cache updated in the
  same transaction.
- **`quest_completions` has `unique (user_id, quest_id)`** — anti-farming at the
  database level; double awards are structurally impossible.
- **`community_notes.content` is `check (char_length <= 280)`**.
- Indexes cover the hot paths (active quests, scans by partner/time, ledger by
  user/time, notes by quest/moderation).

---

## 3. Folder Structure

```
src/
  types/
    db.ts                      # all domain entities + enums
    events.ts                  # typed analytics event catalogue
  lib/
    app/{leveling,session,device,id}.ts   # XP curve, anon session, UA parsing
    analytics/events.ts        # track() + pluggable sinks (Phase 12)
    quests/scanFlow.ts         # QR resolution + scan recording (Phase 6)
    partner/usePartner.ts      # resolves current partner (RBAC)
    supabase/client.ts         # lazy, optional Supabase client
    db/
      repository.ts            # the backend-agnostic contract
      types.ts                 # analytics view-models
      index.ts                 # getRepository() selector
      local/                   # LocalRepository + store + seed
      supabase/                # SupabaseRepository (RPC-backed)
  contexts/
    AuthContext.tsx            # session/profile/role (Phase 4)
    LanguageContext.tsx        # (existing marketing i18n)
  components/
    app/                       # AppLayout, AppHeader, BottomNav, Guards, ui, CommunityNotes
    dashboard/                 # DashboardLayout, AnalyticsView, SimpleTable, navs
    layout/ cards/ ui/         # (existing marketing components)
  pages/
    Index, Quests, ... Hosts   # (existing marketing pages — untouched)
    Auth, ScanResolve, QrLanding, QuestDetail   # public app
    app/                       # AppHome, QuestBrowser, Profile, Wallet, Rewards,
                               # Leaderboard, History, CheckIn, AppCommunityNotes
    partner/                   # PartnerHome, Quests, Analytics, Rewards, QrCodes
    admin/                     # AdminHome, Users, Quests, Partners, Notes, Rewards, Analytics
supabase/
  migrations/{0001_schema,0002_rls,0003_functions}.sql
  seed.sql
  README.md
.env.example
```

---

## 4. Core Routes

| Area    | Route                                   | Component            | Guard            |
| ------- | --------------------------------------- | -------------------- | ---------------- |
| Public  | `/`, `/quests`, `/community-notes`, …   | marketing (existing) | —                |
| Public  | `/auth`                                 | Auth                 | —                |
| Public  | `/scan/:code`                           | ScanResolve          | —                |
| Public  | `/q/:questId`                           | QrLanding            | —                |
| Public  | `/quests/:questId`                      | QuestDetail          | — (sign-in to complete) |
| User    | `/app`, `/app/quests`, `/app/profile`, `/app/wallet`, `/app/rewards`, `/app/leaderboard`, `/app/history`, `/app/checkin`, `/app/community-notes` | app/* | `RequireAuth` |
| Partner | `/partner`, `/partner/quests`, `/partner/analytics`, `/partner/rewards`, `/partner/qr-codes` | partner/* | `RequireRole [partner, admin]` |
| Admin   | `/admin`, `/admin/users`, `/admin/quests`, `/admin/partners`, `/admin/community-notes`, `/admin/rewards`, `/admin/analytics` | admin/* | `RequireRole [admin]` |

> **Note on `/quests`:** the marketing showcase at `/quests` is preserved
> unchanged. The functional, data-driven quest browser lives at `/app/quests`
> (inside the mobile app shell), and the public functional **detail** page lives
> at `/quests/:questId` so QR scanners work pre-auth.

---

## 5–13. Functional Subsystems

- **QR scan flow (6):** `/scan/:code` → `resolveByCode()` records a `scan_event`,
  emits `qr_scanned`, and redirects to `/quests/:id?scan=…`. `/q/:id` does the
  same for direct links. Invalid / inactive / expired quests render typed,
  friendly error screens. Anonymous session ids
  ([`session.ts`](src/lib/app/session.ts)) attribute pre-auth scans and are
  resumed through sign-in via `pendingScan`.
- **Quest completion (7):** `QuestDetail` → `startQuest` → `completeQuest`.
  Verification is per-type (`venue_code` checks a secret; qr/nfc/gps/staff pass
  post-scan in the MVP, tightened server-side in prod). Completion is atomic and
  guarded against duplicates; it writes a completion row + ledger entry, updates
  the cache, recomputes level, marks the scan converted, and prompts a note.
- **XP, points & rewards (8):** XP curve in
  [`leveling.ts`](src/lib/app/leveling.ts). Points always flow through the
  immutable ledger. Rewards: view → redeem (atomic spend + inventory decrement +
  redemption code) → redemption history.
- **Leaderboards (9):** global/city/venue/campaign × weekly/monthly/all-time,
  computed from in-period ledger XP, display-name only, with privacy opt-out.
- **Community Notes (10):** quest-specific, ≤280 chars, completers-only,
  optional image, with an admin moderation queue.
- **Partner analytics (11):** aggregate-only — scans, unique/auth visitors,
  scan→completion conversion, completions, redemptions, notes, scans by day /
  quest / venue. Small samples (<5 scans) are suppressed.
- **Event tracking (12):** typed `track(name, ctx)` in
  [`events.ts`](src/lib/analytics/events.ts) with a pluggable sink model and a
  built-in local sink. All 15 spec'd events are emitted across the flows.
- **Admin (13):** users (roles/status/point adjustments), quests, partners,
  community-note moderation, rewards, and an analytics/scan/audit inspector.

---

## 14. Security & Privacy

- **RBAC** via `AuthContext.role` + `RequireAuth` / `RequireRole` guards on the
  client, and **Row Level Security** on the server
  ([`0002_rls.sql`](supabase/migrations/0002_rls.sql)) as the real boundary.
- **Partner isolation:** `owns_partner()` scopes every partner read/write.
- **Append-only integrity:** ledger/scan/audit have no client write policy;
  mutations go through `SECURITY DEFINER` RPCs
  ([`0003_functions.sql`](supabase/migrations/0003_functions.sql)).
- **Anti-abuse:** unique completion constraint, idempotent attempts, inventory
  guards, verification checks, server-authoritative awards.
- **Consent & audit:** `consent_events` logs every consent change; `audit_logs`
  records sensitive admin/user actions.
- **Privacy-first data:** only coarse device buckets + a "city, region" string
  are captured; precise coordinates are never stored; analytics expose no PII and
  suppress small segments. Users control leaderboard/profile visibility and
  marketing/analytics/location consent from their profile.

> ⚠️ The default LocalRepository enforces these rules in TypeScript for the demo,
> but real enforcement is the RLS + RPC layer — always deploy with Supabase for
> anything beyond local development.

---

## 15. Next Implementation Steps

1. **Wire Supabase auth fully** — map `auth.users` ↔ app `users` on the client
   (the trigger already creates rows); finish OAuth redirect handling.
2. **Server-side verification hardening** — signed QR tokens, GPS geofence
   checks, NFC tag signatures, staff-approval workflow.
3. **Analytics rollups job** — nightly populate `analytics_rollups` and
   `leaderboard_snapshots` (pg_cron / edge function) instead of live aggregation.
4. **Rate limiting & abuse scoring** — per-IP/session scan throttling, velocity
   checks on completions.
5. **Reward fulfillment** — partner-side "mark redeemed", expiry jobs.
6. **Media uploads** — Supabase Storage for Community Note images + moderation.
7. **Native scanning** — camera-based QR scanner (the web check-in accepts a
   typed code today) and NFC Web API where available.
8. **Tests** — unit tests for the ledger/leveling/completion logic against the
   LocalRepository, plus RLS policy tests.
9. **Observability** — register a warehouse sink for `track()` events.

---

## Running it

```sh
npm install
npm run dev          # → http://localhost:8080
```

Open `/auth` and use a **demo account** (Quester / Partner / Admin) to explore
every flow immediately — no backend required. To go production, follow
[`supabase/README.md`](supabase/README.md).
