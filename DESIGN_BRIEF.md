# sidequests website rebuild — design brief

## Design read

This is a product-led mixed surface for people deciding whether leaving the house will be worth it, often while already moving through Miami. It must create curious momentum without becoming tourism branding or a game HUD: editorial, tactile, locally observant, and fast enough for one-handed outdoor use. The interface should feel like a field guide whose pages reveal a playable city. Quality means authentic quest content, photography-led hierarchy, one obvious action, restrained motion, and partner credibility without invented proof.

## Direction

- **Palette:** approved Midnight `#0D1321`, Ocean `#2563EB`, Sand `#F2E8D5`, Palm `#2E7D5A`, Gold `#F2B94B`, and rare Coral `#FF6F61`.
- **Type:** Manrope for display/product hierarchy, Inter for reading and forms, IBM Plex Mono only for compact XP/Points values.
- **Layout:** campaign-like Home and Partnerships; phone-native Explore and Quest Detail. Photography gets the largest surfaces. The signature threshold crop appears once per major marketing page.
- **Signature:** the doorway/path mark becomes structure: an oversized threshold-shaped hero crop and a quiet route line that appears as the next section enters view.
- **Motion:** CSS transitions plus IntersectionObserver only. No smooth scrolling, parallax, scroll pinning, or new dependency.

## Skill loadout and overrides

- Opinion skill: `anthropic-skills` → `frontend-design` only.
- Motion: `emil-design-skills` + `motion-intelligence`.
- Brand overrides generic font/palette recommendations with `brand/design-system.md`.
- Accessibility overrides the brand's legacy blanket `0.01ms` motion reset; the rebuild opts into each effect under `prefers-reduced-motion: no-preference` and preserves static end states.

## Acceptance criteria

1. Home teaches Discover → Visit → Scan → Complete → Capture → Earn with real quest-like UI and one dominant CTA.
2. Explore and Quest Detail feel phone-native from 320–430 px and preserve all current data, auth, analytics, and completion behavior.
3. Shared tokens and components replace the legacy dark-neon gradient/glow language without creating a parallel style system.
4. Marketing and app surfaces share one recognizable visual identity while keeping consumer and partner journeys distinct.
5. Motion validates against the project specs, honors reduced motion, animates only transform/opacity, and passes browser verification.
6. Changed routes pass Accessibility, Mobile UX, and Anti-Slop review with no blockers.
7. Typecheck and production build pass; no new dependency or route/product surface is introduced.

## Open questions

Real partner photography, production reward terms, and verified partner outcome metrics remain content inputs; the rebuild must not invent them.

