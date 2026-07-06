# SideQuests.io — Engineering Roadmap

**Last updated:** 2026-07-06

This roadmap is derived only from the confirmed state in `docs/SYSTEM_STATE.md` and the underlying audits (`docs/audits/2026-07-06-codex-production-audit.md`, `docs/audits/2026-07-06-mcp-production-verification.md`). It does not introduce new findings. Phase 1 and Phase 2 items are known, verified issues; Phase 3 is directional, not committed; Phase 4 is explicitly out of scope per `docs/PRODUCT_DIRECTION.md`.

This is a roadmap, not a project plan — it does not assign owners, dates, or sequencing beyond the phase grouping.

## Phase 1 — Launch Blockers

Issues that prevent a credible public MVP launch. Sourced from `docs/SYSTEM_STATE.md` §14 ("Known Production Blockers").

- **Supabase anon read grants** — live anon reads on `partners`, `venues`, `quests`, `qr_codes`, `rewards`, `community_notes`, and `community_notes_with_author` returned permission-denied per the Codex audit, despite RLS intending public access. Not yet re-verified against a live anon client.
- **Auth/profile bootstrap migration-order trap** — two differently-behaved definitions of `handle_new_auth_user()` exist across migrations (`0006_game_schema.sql` vs. `0003_functions.sql`); whichever ran last on the live database determines whether new signups get a `profiles` row.
- **Missing Fable quest schema fields** — `src/types/db.ts` and `QuestDetail.tsx` expect `funky_action`, `action_type`, `proof_method`, `social_share_prompt`, `staff_phrase`, `estimated_time`, and `links` on `quests`; no checked-in migration creates these columns.
- **Missing `proofs` storage bucket** — proof-photo uploads target a bucket that doesn't exist; upload failures are currently swallowed rather than surfaced.
- **Public profile visibility field mismatch** — Settings writes `profiles.is_public`; the `public_profiles` view filters on `is_profile_public`.
- **Unreachable but linked routes** — `/partner`, `/admin`, `/app/wallet`, `/app/rewards`, `/app/leaderboard`, `/app/history` are linked from mounted pages but not mounted in `src/App.tsx`.
- **Broken auth `next`-redirect** — the quest-completion → sign-in → back-to-quest flow drops the intended destination.
- **Non-`venue_code` completions are trust-the-client** — `complete_quest` marks `qr`/`nfc`/`gps`/`staff` verification types as verified without independent server-side checks. Whether this needs hardening before launch, or is an acceptable MVP trust model, is a product decision, not purely an engineering one.

## Phase 2 — MVP Polish

Issues that reduce launch quality but do not block a launch. Sourced from `docs/SYSTEM_STATE.md` §15 ("Known Technical Debt") and the Codex audit's P1/P2 findings.

- **Unify quest data model** — reconcile the two parallel quest shapes (`Quest` in `src/lib/quests.ts` vs. `QuestWithContext` in `src/types/db.ts`) that currently have no shared mapping layer.
- **Resolve demo/live inconsistency** — `/app/explore`, `/app/map`, and the public `/quests` marketing page still render static demo data unconditionally, while `/app/quests` and `/quests/:questId` read live Supabase data. There is no single, stated policy for which mounted surfaces are live vs. demo.
- **Fix duplicated `AppLayout` shell** — two separately-named layout components (`src/pages/app/AppLayout.tsx` and `src/components/app/AppLayout.tsx`) cause duplicated bottom-nav/wrapper rendering on some mounted pages.
- **Lint cleanup** — the Codex audit found `npm run lint` failing (26 errors, 14 warnings); not yet re-run or fixed.
- **Dependency audit** — `npm audit --omit=dev` reported 10 production vulnerabilities at audit time, including high-severity React Router advisories; not yet re-run or addressed.
- **Stale `ARCHITECTURE.md`** — references migration filenames and mounted routes that no longer match reality.
- **Bundle size** — main chunk (~1.1 MB minified) and Mapbox chunk (~1.8 MB minified) both exceed Vite's 500 KB warning threshold; no code-splitting/`manualChunks` configuration exists yet.
- **Supabase Auth hardening** — enable leaked-password protection; review the `SECURITY DEFINER` RPCs currently callable by `anon`/`authenticated` without restriction, and the public `avatars` bucket's broad listing policy.

## Phase 3 — Growth

Infrastructure that supports expansion once the MVP has validated engagement, repeat usage, and business ROI in Miami. These are directional, not committed or scheduled.

- **Creator tooling** — support for creators building and managing quest lines, per the go-to-market role defined in `docs/PRODUCT_DIRECTION.md`.
- **Partnership dashboards** — a working partner portal (the codebase already has partner pages under `src/pages/partner/`, currently unmounted) so businesses can self-serve analytics and quest management instead of requiring manual setup.
- **Analytics improvements** — deeper partner/platform reporting beyond the current `partner_analytics`/`platform_analytics` RPCs.
- **Stronger verification** — real QR/GPS/staff-approval validation to replace the current trust-the-client model, if/when reward value justifies the investment.
- **Performance optimization** — bundle splitting, chunk size reduction, and general frontend performance work once there's real traffic to optimize for.

## Phase 4 — Future Exploration

Ideas intentionally postponed per `docs/PRODUCT_DIRECTION.md`. These are not commitments — they are recorded here so they aren't rediscovered or re-debated prematurely.

- Token economy / crypto rewards.
- Wallet-chain (Solana) integration.
- Crypto/NFT wallet functionality.
- AR spatial anchors.
- Advanced gamification mechanics beyond the current XP/points/leaderboard/rewards loop.
- Large-scale infrastructure work (e.g., a dedicated backend service, multi-region deployment) — not justified until the current Vite-SPA-plus-Supabase architecture has actually been outgrown.
