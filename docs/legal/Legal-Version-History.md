# Legal Version History

This page is the public changelog for every SideQuests legal document. Each document's own header
(Version / Effective Date / Last Updated) reflects its current state; this page records what
changed and when, across all of them.

## About These Documents

The initial version (`1.0.0`) of every document below was prepared to give SideQuests a complete,
internally-consistent legal foundation ahead of public launch in Miami. They were drafted with
AI assistance, written specifically for how SideQuests actually works today (verified against the
live product and codebase, not a generic template), and deliberately avoid claiming compliance
programs, certifications, or integrations SideQuests does not have.

**These are initial drafts.** We recommend review by a licensed attorney familiar with applicable
consumer-protection, privacy, and platform law before relying on them at meaningful scale or in
new jurisdictions.

## Table of Contents

- [1. How Versioning Works](#1-how-versioning-works)
- [2. Version Table](#2-version-table)

---

## 1. How Versioning Works

Each document uses a three-part version number (`MAJOR.MINOR.PATCH`):

- **Patch** (`1.0.x`) — typo fixes, clarifications, formatting — no change in meaning.
- **Minor** (`1.x.0`) — added sections or expanded coverage that doesn't change existing
  obligations.
- **Major** (`x.0.0`) — material changes to what SideQuests or the user is agreeing to (for
  example, a new data-sharing practice, a changed liability term, or a new required consent).

For the full engineering process behind versioning, rendering, and consent tracking, see
[`README.md`](./README.md) in this directory.

## 2. Version Table

| Document | Version | Effective Date | Summary of Changes |
|---|---|---|---|
| Privacy Policy | 1.1.0 | October 25, 2026 | Minor: new Location Data section — each location feature (map location, Explore near me, GPS check-in, optional nearby alerts), what is kept (GPS check-in results and alert records for 30 days; never coordinates), what stays on the device, and how to turn each feature off. Adds Apple/Google as mobile platform providers and the 30-day retention. |
| Privacy Policy | 1.0.1 | July 7, 2026 | Patch: contact emails consolidated to `support@miamisidequests.io`. No change in meaning. |
| Privacy Policy | 1.0.0 | July 7, 2026 | Initial publication. |
| Terms of Service | 1.1.0 | October 25, 2026 | Minor: location features and nearby alerts are optional, approximate, and never complete a quest; don't respond to alerts while driving. |
| Terms of Service | 1.0.1 | July 7, 2026 | Patch: contact emails consolidated to `support@miamisidequests.io`. No change in meaning. |
| Terms of Service | 1.0.0 | July 7, 2026 | Initial publication. |
| Community Guidelines | 1.0.1 | July 7, 2026 | Patch: contact email consolidated to `support@miamisidequests.io`. No change in meaning. |
| Community Guidelines | 1.0.0 | July 7, 2026 | Initial publication. |
| Cookie Policy | 1.0.1 | July 7, 2026 | Patch: contact email consolidated to `support@miamisidequests.io`. No change in meaning. |
| Cookie Policy | 1.0.0 | July 7, 2026 | Initial publication. |
| Delete Account | 1.1.0 | October 25, 2026 | Minor: lists location-related records and consent records among the data deleted, and explains on-device app data. |
| Delete Account | 1.0.1 | July 7, 2026 | Patch: contact email consolidated to `support@miamisidequests.io`. No change in meaning. |
| Delete Account | 1.0.0 | July 7, 2026 | Initial publication. |
| Partner Terms & Conditions | 1.1.0 | October 25, 2026 | Minor: partner analytics never include player locations, GPS check-in results, or nearby-alert activity, which are never reported as foot traffic. |
| Partner Terms & Conditions | 1.0.1 | July 7, 2026 | Patch: contact email consolidated to `support@miamisidequests.io`. No change in meaning. |
| Partner Terms & Conditions | 1.0.0 | July 7, 2026 | Initial publication. |

Future rows are appended above the previous entry for the same document, newest first, so the
version history reads chronologically for anyone scanning a single document's changes.

**Note on the 1.0.1 patch:** every document previously listed a different purpose-specific address
(`privacy@`, `legal@`, `support@`, `community@`, `partners@`) at the `sidequests.io` domain. These
were placeholders — none were ever live inboxes — consolidated to the one address SideQuests
actually monitors, `support@miamisidequests.io`, on the correct `miamisidequests.io` domain. This
is a contact-channel correction, not a change to any right or obligation described in these
documents, so it did not require re-prompting users for consent; see
[`README.md`](./README.md) for how patch bumps relate to the `terms_version`/`privacy_version`
stamped at signup.
