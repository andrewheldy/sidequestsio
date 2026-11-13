# /vice asset manifest

Every visual on `/vice` is original vector artwork written for this page. No raster images, stock
photos, AI-generated images or third-party artwork are used, and nothing is traced from or modelled
on any game, film or brand artwork. The existing Miami Essentials photos
(`data/generated/miami-essentials/hero/`) were reviewed and not reused: they carry CC BY / BY-SA
attribution requirements and no Wynwood image exists in that set.

| Asset | Where | Purpose | Provenance | License | Attribution | Optimization |
| --- | --- | --- | --- | --- | --- | --- |
| Hero sky, sun, haze | `vice.css` (`.vice-hero__sky`, `__sun`, `__haze`) | Cinematic hero backdrop | CSS gradients authored in this repo | Project-owned | None | No network request |
| Hero skyline | `art.tsx` `HeroSkyline` | Hero skyline and water | Inline SVG authored in this repo (generic rectangles, no real buildings) | Project-owned | None | Inline, in the lazy `/vice` chunk |
| Hero palms | `art.tsx` `HeroPalms`, `Palm` | Hero foreground | Inline SVG authored in this repo | Project-owned | None | Inline |
| Neon Nights | `art.tsx` `NeonScene` | Mission 01 card and sheet | Inline SVG, generic Art Deco facade (not a real hotel) | Project-owned | None | Inline, 4:3 box reserved in CSS |
| Concrete Canvas | `art.tsx` `CanvasScene` | Mission 02 card and sheet | Inline SVG, abstract shapes (not a reproduction of any mural) | Project-owned | None | Inline |
| Calle Ocho Chronicles | `art.tsx` `CalleScene` | Mission 03 card and sheet | Inline SVG, generic street fronts and domino tiles | Project-owned | None | Inline |
| Skyline Hunter | `art.tsx` `SkylineScene` | Mission 04 card and sheet | Inline SVG, generic skyline | Project-owned | None | Inline |
| The Miami Circuit | `art.tsx` `CircuitScene` | Mission 05 card and sheet | Inline SVG, schematic (not a real map) | Project-owned | None | Inline |
| sidequests logo | `brand/logos/*` via `Logo` | Attribution | Existing brand asset | Project-owned | None | Existing SVG |
| Icons | `lucide-react` | UI icons | Existing dependency | ISC | None required | Tree-shaken |
| Big Shoulders Display | Google Fonts, loaded on `/vice` only | Display headings | Third-party font | SIL Open Font License 1.1 | None required | `display=swap`, two weights, removed on unmount |
| Map tiles | Mapbox (existing `QuestMap`) | Mission map | Existing integration | Mapbox terms | Shown by the map control | Lazy chunk |

Replacing artwork: each mission's `art` key in `src/lib/campaigns/vice.ts` selects a scene in
`art.tsx`. Photographs or commissioned illustrations need a row here with source, license and
attribution before they ship. Official Rockstar Games / Take-Two artwork, logos, characters and
lettering must not be added without written authorization.
