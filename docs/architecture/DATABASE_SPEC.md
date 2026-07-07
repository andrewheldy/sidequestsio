# SideQuests Database Specification

## Purpose

This document defines the logical data model for the SideQuests platform.

It explains what information is stored, why it exists, and how different entities relate to one another.

This document complements the SQL migrations but does not replace them.

The SQL migrations are the implementation.

This document is the design reference.

---

# Database Philosophy

The database is the single source of truth for the platform.

It should:

- Preserve data integrity
- Support analytics
- Minimize duplication
- Scale with product growth
- Remain easy to understand

Every table should represent a real business concept.

---

# Core Entities

The MVP revolves around six primary entities:

Users

↓

Businesses

↓

Quests

↓

Quest Completions

↓

Rewards

↓

Community Notes

Everything else supports these relationships.

---

# Users

Represents every registered player.

Stores:

- Authentication reference
- Public profile
- Display name
- Avatar
- XP
- Level
- Points balance
- Account preferences
- Legal consent (see below)

Relationships:

A user can complete many quests.

A user can write many Community Notes.

A user has one Adventure Log.

## Legal Consent

`profiles` stores a versioned snapshot of what a user agreed to at signup, separate from the
live, editable `privacy_preferences` (analytics/marketing/location toggles surfaced in Settings):

- `accepted_terms_at`, `accepted_privacy_at` — timestamps, set once at signup.
- `terms_version`, `privacy_version` — which version of `docs/legal/Terms-of-Service.md` /
  `docs/legal/Privacy-Policy.md` the user agreed to.
- `marketing_opt_in`, `marketing_opt_in_at` — the signup-time marketing choice. This seeds, but
  does not replace, the live `privacy_preferences.marketing_consent` toggle — the latter is what
  Settings reads/writes going forward.

These columns are written once by the `handle_new_auth_user()` trigger at signup and are not
user-editable afterward. Full versioning/rendering/consent-mapping process:
[`docs/legal/README.md`](../legal/README.md).

---

# Businesses

Represents a partner location.

Stores:

- Business name
- Description
- Address
- Coordinates
- Website
- Social links
- Google Reviews link
- Hours
- Contact information

Relationships:

One business can have multiple quests.

---

# Quests

Represents a playable experience.

Stores:

- Title
- Description
- Hero image
- Difficulty
- XP reward
- Point reward
- Estimated completion time
- Business reference
- Status

Relationships:

Each quest belongs to one business.

Many users may complete the same quest.

---

# Quest Completions

Represents a verified completion.

Stores:

- User
- Quest
- Timestamp
- GPS verification
- Media reference
- XP awarded
- Points awarded

Relationships:

Many completions belong to one quest.

Many completions belong to one user.

This table powers:

- Adventure Log
- Progression
- Analytics

---

# Community Notes

Represents player-generated knowledge.

Stores:

- Author
- Quest
- Note
- Timestamp

Future enhancements may include moderation metadata, but the MVP keeps the structure intentionally simple.

---

# Rewards

Represents benefits offered by businesses.

Examples:

- Free item
- Discount
- Merchandise
- Event access

Stores:

- Reward name
- Description
- Redemption requirements
- Business reference
- Availability

---

# Media

Stores uploaded files.

Includes:

- Photos
- Videos
- Business images
- Quest hero images

Media files are stored in object storage.

The database stores only references and metadata.

---

# Adventure Log

The Adventure Log is generated from Quest Completions.

It is not a separate source of truth.

Every completed quest automatically becomes part of a player's history.

---

# Personal Map

The exploration map is also generated.

Rules:

One location equals one persistent map pin.

Repeat visits update the existing record.

This prevents duplicate map markers.

---

# Analytics

Analytics should be event-driven.

Examples include:

- QR scans
- Quest starts
- Quest completions
- Reward redemptions
- Website clicks
- Review clicks
- Social clicks
- Community Notes

Analytics should never become the source of truth for product state.

---

# Relationships

High-level relationship model:

User
 ├── Quest Completion
 ├── Community Note
 └── Adventure Log (derived)

Business
 ├── Quest
 └── Reward

Quest
 ├── Completion
 ├── Community Notes
 └── Media

Reward
 └── Business

---

# Data Integrity

Every table should enforce:

Primary keys

Foreign keys

Required fields

Referential integrity

Validation should occur at both the application and database layers.

---

# Privacy

Collect only the information required to operate the platform.

User-generated content belongs to the user.

Analytics should prioritize aggregation whenever possible.

Personally identifiable information should never be exposed unnecessarily.

---

# Schema Evolution

The schema should evolve gradually.

When adding new tables:

- Document the business purpose.
- Document relationships.
- Update SQL migrations.
- Update application types.
- Update this specification.

Avoid introducing tables for speculative future features.

---

# Migration Guidelines

All schema changes should:

- Preserve existing data
- Be reviewed
- Be version controlled
- Be reversible where practical

Production migrations should always be preceded by a verified backup.

---

# Future Growth

The schema should comfortably support:

- Thousands of users
- Thousands of businesses
- Tens of thousands of quests
- Millions of quest completions

Future features should extend the existing model rather than replacing it whenever possible.

---

# Database North Star

Every table should answer one question:

**"What real-world concept does this represent?"**

If that answer is unclear, the schema should be simplified before implementation.
