# SideQuests.io — Product Direction

**Last updated:** 2026-07-06

This document is the authoritative statement of what SideQuests is, who it's for, and what's deliberately out of scope right now. It is not a design brief and not a roadmap — for current engineering status see `docs/SYSTEM_STATE.md`; for planned work see `docs/ROADMAP.md`; for standing decisions see `docs/DECISIONS.md`.

## Vision

SideQuests turns real-world exploration into a game: people discover places by completing fun, real-world quests — visiting a venue, scanning a QR code, taking a photo, sharing a moment — that encourage exploration, interaction, and sharing.

The platform is built to create value for several groups at once, without locking into any single one:

- **Users** get a fun, low-friction way to discover neighborhoods, venues, and experiences they wouldn't have found otherwise, and to earn recognition (XP, points, rewards) for doing it.
- **Businesses** get foot traffic, visibility, and measurable engagement from a channel that doesn't require them to build anything.
- **Cities** get a tool for surfacing local culture, small businesses, and neighborhoods to residents and visitors.
- **Creators** get a way to turn their local knowledge and audience into quest content.
- **Event organizers** get a mechanism for turning attendance and participation into a structured, trackable game.

The product is intentionally horizontal across these groups rather than committed to one vertical (e.g., "a tourism app" or "a nightlife app"). The current build reflects this: quests, venues, and partners are generic entities in the data model (`supabase/migrations/0006_game_schema.sql`), not specific to any one use case.

## Immediate Goal

**Launch a polished MVP in Miami with real businesses.**

The priority right now is not feature breadth — it's validating three things with real usage:

1. **Engagement** — do people actually complete quests, and enjoy doing it?
2. **Repeat usage** — do users come back for more than one quest?
3. **Business ROI** — do participating businesses see enough value (traffic, visibility, data) to want to renew or expand?

Everything else is downstream of getting real signal on these three questions from a real market.

## Current Product Priorities

The parts of the product that need to work well for the Miami MVP to be credible:

- **Business quest pages** — a venue/business can have a quest tied to it that represents them well.
- **QR onboarding** — a user can scan a code at a venue and land directly in a relevant, working quest flow with no friction.
- **Quest completion** — the core loop (start → do the thing → verify → earn reward) needs to work reliably end-to-end.
- **Proof capture** — users can document that they completed a quest (photo/capture flow), giving both the user a keepsake and the business a piece of social content.
- **Community notes** — lightweight, quest-scoped social proof from people who've actually been there.
- **Analytics** — partners need to be able to see that the quest is working (scans, completions, conversion) to justify continued participation.
- **Partnerships** — the mechanics for bringing new businesses onto the platform and keeping them there.

These map directly to the subsystems already represented in the codebase (see `docs/SYSTEM_STATE.md` §2–3) — the priority is making the existing loop solid, not adding new categories of feature.

## Creator Partnerships

This needs to be stated precisely because it's easy to conflate with the product itself: **creators are not the primary product.**

Creator partnerships are a **go-to-market channel**, not a core product surface. Trusted local creators are valuable because they can:

- introduce SideQuests to their existing audiences,
- create quest lines using their own local knowledge and credibility,
- onboard businesses through relationships the platform doesn't have on its own,
- provide social proof that a new, unproven product otherwise lacks,
- accelerate adoption in a specific market faster than paid acquisition or cold outreach would.

The platform must remain valuable **even without creators** — the core loop (business, quest, user, completion, reward) has to stand on its own. Creator involvement should be additive distribution and content, not a dependency the product can't function without.

## Deferred Features

The following are intentionally postponed, not rejected. They are not being built until the MVP has demonstrated product-market fit:

- **Crypto/token economy** — no on-chain rewards or tokenized incentive system.
- **Solana integration** — no wallet-chain integration of any kind.
- **Wallet** — no crypto or NFT wallet functionality. (Note: the in-app "Wallet" page referenced in the codebase — `src/pages/app/Wallet.tsx` — is a points/rewards ledger view, unrelated to crypto wallets, and is itself currently unmounted; see `docs/SYSTEM_STATE.md` §7 and §14.)
- **AR spatial anchors** — no augmented-reality features.
- **Advanced gamification beyond MVP** — no additional game mechanics layered on top of the current XP/points/leaderboard/rewards loop until that loop is validated.

These are deferred until the core MVP loop has proven product-market fit in the Miami launch market. Building any of these now would be optimizing for a future the product hasn't earned yet.

## Engineering Principle

Every engineering decision made right now should optimize for:

- **launching** — shipping the Miami MVP, not perfecting it before real users see it,
- **onboarding businesses** — reducing friction for a partner to get a working quest live,
- **measuring engagement** — making sure the data needed to know whether the product is working actually gets captured,
- **demonstrating ROI** — giving partners something concrete to point to,
- **validating product-market fit** — treating the Miami launch as a test, not a victory lap.

Do not optimize for hypothetical scale or enterprise requirements. The current architecture (a Vite SPA talking directly to Supabase, with no custom backend server — see `docs/SYSTEM_STATE.md` §1, §3) is appropriately sized for this stage; it should not be over-engineered ahead of evidence that the product needs to scale beyond it.
