# Design Intelligence Connection

- Status: active for the Sidequests readiness site
- Canonical repository: `/Users/heldy/Documents/GitHub/design-intelligence`
- Reviewed ref: `bf9b8b3b6997df3ab4d7958a9d1838d07c50470a`
- Reviewed on: 2026-08-12
- Product brief: `docs/design/readiness/DESIGN_BRIEF.md`
- Motion specifications: `docs/design/readiness/motion/`
- Verification report: `docs/design/readiness/VERIFICATION.md`

## Authority order

1. Sidequests brand truth in `docs/product/DESIGN_SYSTEM.md` and the supplied brandboard.
2. Accessibility and motion safety rules from Design Intelligence.
3. The readiness-site design brief.
4. Registered reviewer heuristics for anti-slop, mobile UX, accessibility and motion.

## Selected guidance

- Surface: editorial marketing brief.
- Opinion lens: the registered Taste heuristic set, used as a review lens because the external `taste-skill` package is not installed in this Codex environment.
- Motion: `motion-director`, `motion-selection`, `motion-accessibility`, `motion-performance`, `motion-react`, `motion-verification` and `motion-audit`.
- Reviewers: Design Director, Design Engineer, Anti-Slop, Accessibility, Mobile UX and Motion.

## Exceptions

- The original product request explicitly requires Framer animation while scrolling. Scroll reveals therefore use the existing `framer-motion` dependency even though opacity/transform reveals could be implemented at a lower tier. The implementation is intentionally limited to below-the-fold orientation, uses no scroll hijacking, and provides an opacity-only reduced-motion branch.
- “Impeccable” is not present in the local Design Intelligence registry or installed skill catalog. No claim is made that it was used.

## Maintenance

Before material visual changes, re-check the canonical repository ref, the brand documents and the exceptions above. Record reusable findings in the project rather than modifying the canonical repository from a product task.
