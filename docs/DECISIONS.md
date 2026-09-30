# SideQuests.io — Engineering Decision Log

A lightweight, append-only log of standing engineering and product decisions. This is not a design-discussion record — it captures the decision and its date, not the debate. When a decision changes, add a new entry noting the change rather than editing history.

For the reasoning behind the product-level decisions here, see `docs/PRODUCT_DIRECTION.md`. For current technical state, see `docs/SYSTEM_STATE.md`.

---

**2026-07-06 — Supabase remains the backend.**
Postgres + Auth + Storage + RPC via Supabase is the system of record. No custom backend server exists or is currently planned; see `docs/SYSTEM_STATE.md` §1, §3.

**2026-07-06 — Vercel hosts production.**
The app deploys as a static Vite build to Vercel (`vercel.json`), with production live at `miamisidequests.io`. No serverless/edge functions are configured.

**2026-07-06 — LocalRepository exists as a graceful fallback, not a demo mode.**
`LocalRepository` (`src/lib/db/local/`) is a fully functional, in-browser implementation of the `Repository` interface backed by `localStorage`, used when Supabase isn't configured or fails to initialize. It contains real business logic (ledger, completion guards, leveling), not canned demo content, and is distinct from `MockRepository`.

**2026-07-06 — MockRepository is development-only.**
`MockRepository` is now selected only when `import.meta.env.DEV` is true (Vite's dev-build flag), never by an environment variable. It cannot be enabled in a production build regardless of what's configured in Vercel. This replaced the prior `VITE_DATA_SOURCE=mock` env-var toggle, which had been set on Vercel in both Preview and Production.

**2026-07-06 — Wallet development is paused.**
The in-app `Wallet` page (a points/rewards ledger view, unrelated to crypto) exists in code but is not mounted in `src/App.tsx`. No further wallet work is planned until Phase 1/2 items in `docs/ROADMAP.md` are resolved.

**2026-07-06 — Token development is paused.**
No crypto/token economy work is in progress or planned. See "Deferred Features" in `docs/PRODUCT_DIRECTION.md`.

**2026-07-06 — Creator partnerships are a go-to-market strategy, not the core product.**
Creators are a distribution and content channel for reaching businesses and users faster in a new market. The core product (quest → completion → reward loop) must work independently of creator involvement. See `docs/PRODUCT_DIRECTION.md`.

**2026-07-06 — Miami is the current validation market.**
The immediate goal is a polished MVP launch with real Miami businesses, validating engagement, repeat usage, and business ROI before expanding to other markets or verticals.

**2026-07-06 — Engineering favors shipping over premature optimization.**
Decisions should optimize for launching, onboarding businesses, measuring engagement, and demonstrating ROI — not for hypothetical scale or enterprise requirements the product hasn't earned yet. See `docs/PRODUCT_DIRECTION.md`, "Engineering Principles."

**2026-09-27 — Quests can be generated on the spot from curated frameworks.**
Product-owner decision overturning the MVP exclusion of generated quests. Generation fills curator-written templates (no AI), only at partner venues, and a quest may be repeated after a cooldown it opts into. See "Generated Quests" in `docs/product/PRODUCT_DECISION_LOG.md` and `supabase/migrations/0017_quest_frameworks.sql`.

**2026-09-28 — One reusable quest page template, location-first.**
`/quests/:questId` renders every quest through one data-driven template (`src/pages/QuestDetail.tsx` + `src/lib/quests/questPage.ts`): location hero, intro, one required action, Explore & Share, venue card. The Frost Museum of Science mockup is the design reference and first sample; nothing venue-specific lives in components.

**2026-09-28 — Explore & Share shows per-platform social cards.**
Product-owner decision superseding the 0014-era rule that socials are a single Linktree-style link. Instagram, TikTok, X, Google Review and website each get a card, read from `quests.links`. Outbound clicks are tracked but never counted as completions, and advertised points (`links.action_points`) are not credited until a verification path exists. See `docs/QUEST_CONTENT_IMPORT.md`.

**2026-09-28 — The app bottom nav has exactly three tabs: Rewards, Map, You.**
No camera/scan tab: capture belongs to quest actions that need a photo, and venue codes open from the phone's own camera (`/scan/<code>`). Explore/Quests/quest pages sit under Map; Saved quests moved to the Profile page; `/app/rewards` is now mounted.

**2026-09-30 — Partner Insights: read-only analytics for partners and admins.**
Product-owner decision that supersedes PD-1 (docs/engineering/PRODUCTION_SPRINT_PLAN.md) for analytics only.
- `/partner` (partner overview) and `/partner/venues/:venueId` (one venue) are mounted.
- Admins see every partner. A partner login sees only its own partner, enforced by `owns_partner()` in `partner_insights()` (0021).
- Analytics only: the old partner pages for quests, rewards and QR codes stay unmounted, and quest content stays curated by SideQuests.

