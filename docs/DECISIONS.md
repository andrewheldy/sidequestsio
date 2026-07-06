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
Decisions should optimize for launching, onboarding businesses, measuring engagement, and demonstrating ROI — not for hypothetical scale or enterprise requirements the product hasn't earned yet. See `docs/PRODUCT_DIRECTION.md`, "Engineering Principle."
