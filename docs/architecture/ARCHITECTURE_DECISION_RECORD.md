# SideQuests Architecture Decision Record (ADR)

## Purpose

This document records significant technical and architectural decisions made throughout the development of SideQuests.

Each decision explains:

- The context
- The decision
- The reasoning
- The expected consequences

This document preserves engineering context and prevents repeated debates.

---

# ADR-001

## Use a React + TypeScript SPA

### Status

Accepted

### Context

The MVP must be developed quickly while remaining maintainable and accessible across devices.

### Decision

Build the frontend as a React Single Page Application using TypeScript and Vite.

### Rationale

Benefits include:

- Rapid development
- Strong TypeScript ecosystem
- Excellent developer tooling
- Mature component model
- Easy deployment

### Future Review

Revisit only if the application requires capabilities that are not practical within the current architecture.

---

# ADR-002

## Use Supabase as the Backend Platform

### Status

Accepted

### Context

The MVP requires authentication, database storage, file storage, and row-level security.

### Decision

Use Supabase as the primary backend platform.

### Rationale

Provides:

- PostgreSQL
- Authentication
- Storage
- Row-Level Security
- SQL migrations
- Rapid iteration

This minimizes infrastructure complexity during the MVP stage.

---

# ADR-003

## Mobile-First Web Application Before Native Apps

### Status

Accepted

### Context

The objective is to validate product-market fit before investing in multiple client platforms.

### Decision

Launch as a responsive web application first.

### Rationale

Allows:

- Faster iteration
- Single codebase
- Easier testing
- Lower maintenance

Native applications remain a future opportunity after validation.

---

# ADR-004

## Curated Quest Platform

### Status

Accepted

### Context

Many user-generated content platforms suffer from inconsistent quality.

### Decision

SideQuests will curate quest experiences.

Businesses, creators, and community guides collaborate with SideQuests rather than publishing directly.

### Rationale

Maintains:

- Consistent quality
- Better player experience
- Stronger brand trust
- Better partner outcomes

Quality is prioritized over quantity.

---

# ADR-005

## Community Guides Instead of Open Quest Creation

### Status

Accepted

### Context

Trusted local voices can dramatically improve discovery without sacrificing consistency.

### Decision

Introduce a Community Guide program rather than unrestricted user-generated quests.

Community Guides may:

- Co-design quest lines
- Recommend businesses
- Provide local expertise
- Promote completed quest collections

Quest publication remains a collaborative workflow reviewed by the SideQuests team.

### Rationale

This combines:

- Authentic local knowledge
- Creator reach
- Editorial quality
- Consistent platform standards

---

# ADR-006

## QR-Based Verification

### Status

Accepted

### Context

Quest completion requires practical verification of real-world visits.

### Decision

Use venue QR codes as the primary verification method.

### Rationale

QR verification is:

- Simple
- Reliable
- Low cost
- Easy for businesses to deploy

Additional verification methods may be introduced only when justified by reward value.

---

# ADR-007

## Separate XP and Points

### Status

Accepted

### Context

Progression and rewards serve different purposes.

### Decision

Maintain separate systems.

XP measures progression.

Points are redeemable.

### Rationale

Creates a clearer mental model for users and allows each system to evolve independently.

---

# ADR-008

## Community Notes

### Status

Accepted

### Context

Players should contribute knowledge after completing quests.

### Decision

Replace the earlier Breadcrumb concept with Community Notes.

### Rationale

Community Notes are easier to understand and reinforce SideQuests as a collaborative exploration platform.

---

# ADR-009

## Partner Businesses as the Initial Market

### Status

Accepted

### Context

The platform requires measurable value for both consumers and businesses.

### Decision

Launch with independent local businesses before expanding into larger organizations.

### Rationale

Independent businesses:

- Move faster
- Provide direct feedback
- Offer unique experiences
- Create dense exploration districts

This provides the fastest path to validating product-market fit.

---

# ADR-010

## Documentation as a First-Class Asset

### Status

Accepted

### Context

AI coding assistants and future contributors require consistent project context.

### Decision

Maintain comprehensive documentation with a single source of truth for every major subject.

### Rationale

Good documentation:

- Reduces implementation drift
- Speeds onboarding
- Preserves institutional knowledge
- Improves engineering consistency

Documentation should evolve alongside the product.

---

# Decision Lifecycle

Every new Architecture Decision Record should include:

- Identifier
- Title
- Status
- Context
- Decision
- Rationale
- Consequences
- Review trigger (if applicable)

Superseded decisions should remain in this document with their status updated rather than being deleted.

---

# Engineering Principle

Architectural decisions should optimize for:

- Simplicity
- Reliability
- Maintainability
- Product velocity
- Long-term flexibility

The best architecture is the one that allows SideQuests to deliver exceptional real-world experiences while remaining understandable to every future contributor.
