# Logo system

The approved visual reference is `source/approved-logo.png` (2026-10-25). `source/emblem.png` and `source/wordmark.png` retain transparent exports for reference. Production SVGs embed the optimized ivory-and-gold emblem; the custom wordmark is traced vector geometry, with no live fonts.

`logo-primary.svg` and `logo-horizontal.svg` are combined signatures. Product screens compose `icon.svg` and `wordmark.svg` through `src/components/brand/Logo.tsx`; sizes and tone rules live in [the brand guide](../README.md#screen-lockup).

- `wordmark.svg`: navy lettering for light surfaces; `wordmark-reverse.svg`: ivory for dark surfaces and photo overlays.
- `icon.svg`: detailed emblem on a navy tile for light surfaces; `icon-reverse.svg`: transparent detailed emblem for dark surfaces.
- `icon-small.svg` / `logo-small.svg`: compact vector silhouette using `currentColor` for inline SVG use.
- `app-icon.svg`: detailed rounded tile; `app-icon-maskable.svg`: full-bleed tile with safe-zone padding.
- `favicon.svg`: compact ivory silhouette and gold star for small browser tabs; `mask-icon.svg`: black silhouette for Safari pinned tabs.
- `logo-circle.svg`: circular profile badge; `logo-square.svg` / `logo-vertical.svg`: stacked navy compositions.
- `logo-light.svg`, `logo-dark.svg`, `logo-reverse.svg`, `logo-monochrome.svg`, `logo-solid.svg`, `logo-outlined.svg`, `logo-embossed.svg`: matching secondary treatments.

Run `npm run assets:brand` to refresh browser icons, install icons, share cards, and brand-kit PNGs. Never typeset the signature or replace the lettering with a similar font.
