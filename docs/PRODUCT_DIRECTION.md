# SideQuests Product Direction

**Last updated:** 2026-07-06

This document is the authoritative statement of SideQuests' current product strategy: where the product is today, what's being built next, and what is intentionally not being built yet. It is not marketing copy, not a pitch deck, and not a speculative vision document. For current engineering status see `docs/SYSTEM_STATE.md`; for planned work see `docs/ROADMAP.md`; for standing decisions see `docs/DECISIONS.md`.

## Purpose

SideQuests turns exploring the real world into an interactive game.

People discover restaurants, coffee shops, local businesses, events, attractions, museums, parks, campuses, conferences, festivals, sports venues, and cities by completing fun, real-world quests. The objective is to make discovery more engaging while creating measurable value for businesses and communities.

The platform should never be described as being limited to restaurants or food. Restaurants are simply the easiest first market — they're plentiful, easy to onboard, and easy for a first user to understand. The underlying data model already reflects this: `partners`, `venues`, and `quests` are generic entities (`supabase/migrations/0006_game_schema.sql`), not restaurant-specific ones.

## Core Product Philosophy

The real-world location is the game.

Businesses become quest givers. Users complete memorable, social, and interactive challenges instead of simply checking in. Every quest should encourage genuine interaction with the venue, staff, products, or community — not a passive tap or a passive visit.

Examples of what a quest can ask a user to do:

- discovering secret menu items
- solving riddles
- finding hidden objects
- asking fun questions
- completing themed challenges
- attending events
- interacting with exhibits
- participating in seasonal activities

The experience should be memorable enough that people naturally want to share it. This is why proof capture and Community Notes exist as core mechanics (`src/components/app/QuestProofCamera.tsx`, `src/lib/db/supabase/SupabaseRepository.ts` community-notes methods) rather than as optional add-ons — sharing is part of the loop, not a bonus feature.

## Current MVP Goal

The immediate objective is a successful Miami launch.

Success means validating that:

- users enjoy completing quests
- businesses receive measurable value
- quests drive foot traffic and engagement
- users return to complete additional quests
- the platform is compelling enough to expand into additional cities

Everything should optimize toward proving product-market fit — not toward theoretical scale, additional verticals, or additional markets before this one is proven.

## Current Product Scope

The current focus is delivering a polished, production-ready MVP that can be successfully launched with real businesses in Miami.

Current development prioritizes:

- Business quest pages
- QR-based quest discovery
- Quest completion and proof capture
- Community Notes
- User profiles
- Business onboarding
- Analytics that demonstrate value to partners
- Reliable production infrastructure

These map directly to subsystems that already exist in the codebase — quest detail and QR resolution (`src/pages/QuestDetail.tsx`, `src/lib/quests/scanFlow.ts`), completion and proof capture, Community Notes, profiles (`src/contexts/AuthContext.tsx`), and partner analytics RPCs (`partner_analytics`, `platform_analytics` in `supabase/migrations/0003_functions.sql`). The priority is making this existing loop solid and production-ready — per `docs/SYSTEM_STATE.md` and `docs/ROADMAP.md`, several of these subsystems currently have known gaps (missing Supabase grants, unmounted partner/admin routes, a missing `proofs` storage bucket) that need to be resolved before the loop can be called reliable.

Ideas outside this scope may be explored in the future but are intentionally excluded from current engineering priorities until the core product has been validated with real users and business partners.

## Deferred Features

The following are intentionally postponed, not rejected — they are not being built until the MVP has demonstrated product-market fit in Miami:

- crypto/token economy
- Solana or any other blockchain/wallet-chain integration
- crypto or NFT wallet functionality
- AR spatial anchors
- advanced gamification mechanics beyond the current XP/points/leaderboard/rewards loop

Building any of these now would be optimizing for a future the product hasn't earned yet.

## Business Model

Businesses purchase or subscribe to create sponsored quests. Quest pages are designed to provide measurable analytics — interactions, scans, quest completions, outbound link clicks, and engagement — so a partner can see the value the platform is generating for them.

The long-term value proposition is helping businesses convert discovery into measurable customer activity: a quest isn't just a marketing placement, it's a trackable funnel from awareness to a real visit to a completed action.

This is the intended model. No billing, subscription, or payment infrastructure exists in the codebase today, and the analytics currently implemented (`partner_analytics`, `platform_analytics`) cover scans, unique/authenticated visitors, scan-to-completion conversion, completions, redemptions, and notes — not yet outbound link clicks or a monetized quest-purchase flow. Building that infrastructure is downstream of validating the core loop in Miami, not a current engineering priority (see `docs/ROADMAP.md`).

## Creator Partnerships

This needs to be stated precisely, because it's easy to conflate with the product itself: **creators are not the primary product.**

Creator partnerships are one go-to-market strategy. Trusted community members, food creators, local influencers, event organizers, university leaders, and other established community figures can:

- introduce SideQuests to their audiences
- create their own curated quest lines
- help onboard businesses through existing relationships
- generate authentic content
- accelerate trust within local communities

The platform should remain valuable without creators. Creators accelerate adoption — they are not the foundation of the product. The core loop (business creates a quest, user discovers and completes it, business sees measurable value) has to work on its own merits.

## Long-Term Vision

The platform should eventually support many types of communities, including:

- cities
- universities
- conferences
- festivals
- sporting events
- tourism
- hospitality
- retail
- museums
- entertainment districts

The same quest engine should power all of these experiences. Nothing in the current data model or architecture is restaurant-specific or Miami-specific — expansion to new verticals and markets is a matter of content and go-to-market, not a rebuild. That said, none of this expansion is being built ahead of proving the model in Miami; see "Current MVP Goal" above.

## Engineering Principles

Engineering decisions should prioritize:

- shipping
- simplicity
- maintainability
- measurable business value
- user engagement
- rapid onboarding
- business adoption
- reliable analytics

Avoid premature optimization. Avoid enterprise-scale architecture that is unnecessary for the current stage — the current architecture (a Vite SPA talking directly to Supabase, no custom backend server; see `docs/SYSTEM_STATE.md` §1, §3) is appropriately sized for where the product is, and should not be over-engineered ahead of evidence that it's been outgrown. Avoid adding features simply because they are technically interesting.

Every major feature should support one or more of these questions:

- Does this help users complete more quests?
- Does this help businesses see more value?
- Does this improve retention?
- Does this improve onboarding?
- Does this strengthen product-market fit?

If the answer is no, the feature should probably wait.

## Definition of Success

For the current phase, success is not measured by valuation or theoretical scalability.

Success means launching in Miami with real businesses, real users, measurable engagement, repeat quest completion, strong analytics, and enough traction to confidently expand into additional cities and verticals.
