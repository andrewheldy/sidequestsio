# Design Intelligence — Project Connection Record

> This project reads the canonical [`design-intelligence`](https://github.com/andrewheldy/design-intelligence)
> repository at a pinned revision. Nothing is synchronized, vendored, or installed.

## 1. Identity

| Field | Value |
|---|---|
| **Project name** | sidequests |
| **Project repository** | `https://github.com/andrewheldy/sidequestsio` |
| **Product type** | `mixed` |
| **Primary surfaces** | Miami marketing site, quest discovery app, quest detail/completion, authentication, partner conversion |
| **Target users** | Miami locals and visitors looking for a worthwhile real-world adventure; local businesses seeking measurable visits and engagement. |
| **Project owner** | Andrew Heldy |
| **Integration status** | `active` |

## 2. Constraint envelope

| Field | Value |
|---|---|
| **Accessibility requirements** | WCAG 2.2 AA; visible focus; reduced-motion support; core paths operable by keyboard. |
| **Responsive requirements** | 320–430 px must feel phone-native; 768 px and 1440 px must recompose without overflow; 200% zoom must remain usable. |
| **Motion constraints** | UI transitions stay at or below 300 ms; only transform/opacity animate; no smooth-scroll library; motion is opt-in under `prefers-reduced-motion: no-preference`; no animation may delay navigation or completion. |

**Non-overridable floor:** `prefers-reduced-motion`, visible focus indicators, and WCAG AA contrast take precedence over every skill directive and every brand rule.

## 3. Project-owned locations

| Field | Path (repo-relative) |
|---|---|
| **Brand-system location** | `brand/design-system.md` |
| **Design-decision-log location** | `docs/product/PRODUCT_DECISION_LOG.md` |
| **Reusable-findings location** | `docs/design/REUSABLE_FINDINGS.md` |

## 4. Canonical Design Intelligence link

| Field | Value |
|---|---|
| **Canonical repository URL** | `https://github.com/andrewheldy/design-intelligence` |
| **Canonical commit / release / version last reviewed** | `aac21b3287b62f9488e879b58650f08569550cb8` |
| **Last review date** | 2026-08-15 |
| **Reviewed by** | Codex with project owner direction |

Nothing is synchronized. This project does not pull, install, submodule, or vendor the canonical repository.

## 5. Applicable Design Intelligence agents

- [x] `design-director`
- [x] `design-engineer`
- [x] `accessibility-reviewer`
- [x] `anti-slop-reviewer`
- [x] `motion-reviewer`
- [x] `mobile-ux-reviewer`

## 6. Applicable registry entries

| Registry `id` | Status at last review | Why it applies here |
|---|---|---|
| `anthropic-skills` | approved | `frontend-design` is the single opinion skill for the product-led mixed surface. |
| `emil-design-skills` | approved | Motion character and restraint. |
| `motion-intelligence` | approved | Engine selection, specification, accessibility, performance, and verification. |

**One-opinion-skill rule:** never load more than one of `taste-skill`, Anthropic `frontend-design`, or `ui-ux-pro-max` for the same task. This rebuild uses only `frontend-design`.

## 7. Current exceptions

| ID | Rule or recommendation overridden | Source | Reason | Approved by | Expires / review by | Status |
|---|---|---|---|---|---|---|
| EX-1 | Marketing surfaces ordinarily select `taste-skill`. | Integration contract | This task rebuilds the connected product and marketing shell as one system; `frontend-design` is the single opinion source to prevent competing token/layout directions. | Project owner direction | End of rebuild | active |
| EX-2 | Generic skills may recommend a fresh palette or font pairing. | `frontend-design` | The approved project brand already mandates Manrope, Inter, and the Midnight/Ocean/Sand/Palm/Gold/Coral palette. Brand wins. | Project brand system | Permanent | active |

## 8. HeldyOS link (optional)

No project-owned link is recorded yet.

## 9. Connected readiness brief

The `/readiness` editorial brief was produced as an earlier, separately verified surface and remains
part of this repository.

| Field | Value |
|---|---|
| **Design Intelligence ref used** | `bf9b8b3b6997df3ab4d7958a9d1838d07c50470a` |
| **Reviewed on** | 2026-08-12 |
| **Product brief** | `docs/design/readiness/DESIGN_BRIEF.md` |
| **Motion specifications** | `docs/design/readiness/motion/` |
| **Verification report** | `docs/design/readiness/VERIFICATION.md` |

The readiness brief uses `framer-motion` for explicitly requested below-the-fold scroll reveals.
That exception is scoped to the readiness surface: it uses no scroll hijacking and provides a
reduced-motion branch. The primary product rebuild continues to use native CSS and the existing
IntersectionObserver enhancement described above.

The readiness review used the registered Taste heuristic set as a review lens because the external
`taste-skill` package was not installed in that environment. “Impeccable” was not present in the
local registry or installed skill catalog, and no claim is made that it was used.

## Required workflow

Read this record, the project brand, the pinned Design Intelligence contract and applicable entries, then `DESIGN_BRIEF.md`. Establish tokens before components, implement in the existing stack, and run the relevant accessibility, anti-slop, motion, and mobile reviews. Accepted and rejected decisions belong in the decision log; reusable cross-venture findings stage in `docs/design/REUSABLE_FINDINGS.md`.
