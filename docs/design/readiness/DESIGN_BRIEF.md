# Sidequests Readiness Brief — Design Brief

**Objective**  
Give a founder a credible, shareable view of product maturity, architecture, progression, user journey, GTM, cost, entity choices and compliance work. A reader should understand the current stage and next milestone in under five minutes, then inspect supporting detail without leaving the page.

**Audience**  
Founder, collaborators, advisors, pilot partners and early investors. The artifact is a status brief, not a consumer acquisition page and not a fundraising deck.

**Brand truth**  
Discovery is a doorway. Use the supplied Sidequests system: Midnight Navy `#0D1321`, Ocean Blue `#2563EB`, Warm Sand `#F2E8D5`, Palm Green `#2E7D5A`, Reward Gold `#F2B94B`, Coral `#FF6F61`; lowercase wordmark; geometric, friendly, confident typography. Light mode is the first-visit default.

**Visual direction**  
An editorial field report with a strong reading rhythm, asymmetric compositions, ruled lists and a few data-led diagrams. Avoid the generic AI-dashboard vocabulary: equal card grids, excessive pills, uniform shadows, oversized radii, gradient headlines, floating blobs and repeated reveal effects. Dark sections may punctuate the light document; dark mode converts the full reading surface.

**Information hierarchy**  
1. Stage and recommendation. 2. Immediate blockers. 3. System architecture and product economy. 4. Onboarding and readiness evidence. 5. GTM and market cost. 6. Entity/compliance. 7. Ninety-day gates and sources.

**Interaction**  
The rightmost top-bar control opens a section menu. Theme choice persists for the current browser tab so every new visit still starts light. Architecture, cost scenario and XP calculator controls must update immediately, remain keyboard operable and never require motion to reach their end state.

**Motion character**  
Quiet, directional and editorial. Above-the-fold content is visible on first paint. Below-the-fold sections may rise 10–12px while fading over 320–380ms with a custom deceleration curve. No parallax, pinning, scroll hijacking or layout-property animation. Reduced motion removes travel and preserves content with a short opacity change.

**Accessibility floor**  
WCAG 2.2 AA intent: semantic landmarks and headings, visible focus, 44px primary mobile targets, no horizontal overflow at 320px, correct menu disclosure semantics, Escape-to-close with focus return, sufficient contrast in both themes, and complete `prefers-reduced-motion` support.

**Exit criteria**  
Production build succeeds; light is the unsaved default; dark choice persists; hamburger is the rightmost top-bar control; all interactive elements work by keyboard; no console errors; no horizontal overflow at 320/375/768/1440; reduced-motion end states remain available; Netlify folder and ZIP open at `/` without configuration.
