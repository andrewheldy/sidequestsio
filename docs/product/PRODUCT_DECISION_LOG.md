# SideQuests Product Decision Log

## Purpose

This document records important product decisions and the reasoning behind them.

It exists to preserve context, prevent repeated discussions, and explain why specific product choices were made.

When proposing a significant product change, review this document first.

---

# Decision Philosophy

Product decisions should be guided by:

- Simplicity
- User experience
- Business value
- Long-term maintainability
- Real-world validation

Ideas should earn their place through evidence rather than novelty.

---

# Visual Experience Direction (2026-08-15)

## Decision

SideQuests should feel like a **playable field guide**: editorial, tactile, and grounded in real Miami
places. The visual signature is a threshold or doorway that frames photography and suggests crossing
from the familiar city into an unexpected experience.

Motion is supporting evidence, not decoration. It may reveal the path through a page, clarify state,
or add a small sense of discovery, but must remain brief, optional, and subordinate to the content.

### Why

The product is asking people to leave the screen and notice the physical world. A calm field-guide
system makes curated quests feel intentional and trustworthy while the threshold motif provides a
distinctive sense of possibility. This direction reinforces the existing core loop without adding a
new feature, currency, publishing model, or navigation surface.

### Expected outcome

Users should understand what SideQuests is, why a quest is worth a detour, and what happens after they
arrive. Partners should see a curated experience product rather than a coupon marketplace or generic
local directory.

---

# Product Vision

## Decision

SideQuests focuses on turning real-world exploration into a game.

### Why

This creates a product that benefits both consumers and local businesses.

Rather than competing with directories, review platforms, or coupon apps, SideQuests creates interactive experiences that encourage people to visit real places.

---

# B2B2C Business Model

## Decision

Businesses fund the platform while consumers use it for free.

### Why

Businesses receive measurable customer engagement.

Consumers receive entertainment and rewards without subscription barriers.

This aligns incentives for both sides of the marketplace.

---

# QR Verification

## Decision

Quest completion begins with scanning a QR code at the location.

### Why

QR codes provide a simple, reliable method for verifying that a user has physically visited the destination.

This reduces fraudulent completions while remaining easy for businesses to deploy.

---

# Community Notes

## Decision

Community Notes replace the earlier Breadcrumb concept.

### Why

Community Notes more clearly communicate the feature's purpose.

They encourage collaboration and local discovery without requiring users to understand a unique term.

---

# XP and Points

## Decision

XP and Points serve different purposes.

XP represents progression.

Points represent spendable rewards.

### Why

Separating progression from rewards makes both systems easier to understand and balance.

Players always know:

XP increases their level.

Points purchase benefits.

---

# Adventure Log

## Decision

Every completed quest is permanently recorded.

### Why

The Adventure Log transforms the app into a personal history of exploration rather than a collection of completed tasks.

This increases long-term attachment to the platform.

---

# Personal Exploration Map

## Decision

Each location creates one persistent pin.

Repeat visits update the existing pin.

### Why

The map should represent a user's exploration history, not duplicate entries.

This keeps the map meaningful as users revisit favorite places.

---

# Quest Philosophy

## Decision

Quests should create memorable experiences rather than maximize difficulty.

### Why

The objective is exploration, not competition.

The best quests encourage curiosity and conversation.

---

# Business Experience

## Decision

Businesses receive a dedicated quest page rather than a traditional listing.

### Why

The quest page creates measurable interactions and encourages meaningful engagement instead of passive browsing.

---

# Launch Market

## Decision

Launch with independent local businesses.

### Why

Smaller businesses can move quickly, provide direct feedback, and benefit significantly from incremental customer traffic.

This creates a manageable environment for validating product-market fit before expanding.

---

# Founding Partner Program

## Decision

Offer a limited free period to the first cohort of businesses.

### Why

The goal is to gather feedback, testimonials, and case studies while refining onboarding and proving customer value.

Early partnerships prioritize learning over revenue.

---

# MVP Scope

## Decision

The MVP intentionally focuses on a narrow set of features.

### Included

- Quest discovery
- QR verification
- Quest completion
- XP
- Points
- Community Notes
- Adventure Log
- Business analytics

### Excluded

- Messaging
- Friends
- Guilds
- User-generated quests
- AR experiences
- AI-generated quests
- Marketplace trading
- Complex moderation
- Cryptocurrency and blockchain integrations

### Why

A focused MVP is easier to build, test, and improve.

Additional features should be introduced only after validating the core experience.

---

# Product Metrics

## Decision

Measure meaningful engagement instead of vanity metrics.

### Priorities

- Quest completions
- Repeat visits
- Business engagement
- Partner retention
- User retention

### Why

These metrics directly reflect whether the platform is creating value for both users and businesses.

---

# Engineering Philosophy

## Decision

Optimize for clarity and iteration speed over premature scalability.

### Why

The product is in an early stage.

Simple systems are easier to maintain, improve, and adapt as real user feedback is collected.

---

# Documentation Philosophy

## Decision

Each topic has a single source of truth.

### Why

Duplicated documentation quickly becomes inconsistent.

Each document should have one clear responsibility, with cross-references instead of repeated content.

---

# Decision Review Process

Not every idea belongs in the product.

Before introducing a significant feature, ask:

1. Does it improve real-world exploration?
2. Does it create measurable value for partner businesses?
3. Does it fit the current stage of the product?
4. Does it simplify or complicate the user experience?
5. Is there evidence from users or partners that this feature is needed now?

If the answer to most of these questions is "no," the idea should remain in the backlog until conditions change.

---

# Living Document

This document should evolve alongside the product.

When a major product decision is made, record:

- The decision
- The reasoning
- The expected outcome

Future contributors should understand not only what SideQuests does, but why it was designed that way.
