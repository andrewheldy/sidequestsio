# sidequests brand asset library

Production system for the approved ivory-and-gold doorway and playful lowercase wordmark. The smooth winding path and guiding star keep the original exploration story; the lettering blends rounded shapes with a restrained hand-drawn character. The approved reference is `logos/source/approved-logo.png`.

## Quick start

1. Import `colors/tokens.css`, `typography/type-tokens.css`, `ui/ui-tokens.css`, and `assets/motion.css` once at the application root.
2. Use `logos/logo-horizontal.svg` as the default marketing header logo and `logos/icon-small.svg` below 32 px. Product screens use the composed lockup instead — see "Screen lockup".
3. Use `icons/*.svg` with CSS `color`; the SVGs inherit `currentColor`.
4. Use `illustrations/*.svg` only for empty, loading, success, and onboarding states.
5. Use raster exports in `social/` and `assets/` for platforms that do not accept SVG. Browser and app icons are generated into `public/` — see "Favicon and app installation".
6. Read `design-system.md` before translating the system into Tailwind or shadcn tokens.

## Folder map

- `logos/` — traced vector wordmark, SVG lockups with embedded transparent ivory/gold artwork, compact vector silhouettes, and app icons.
- `icons/` — 27 product icons on a unified 24 px construction grid.
- `typography/` — font recommendations, responsive scale, and CSS type utilities.
- `colors/` — machine-readable HEX/RGB/HSL data and CSS primitives/semantic aliases.
- `illustrations/` — ten production SVG states plus illustration rules.
- `mockups/` — application boards for review; never ship mockup artwork as UI.
- `social/` — editable and raster Open Graph, X/Twitter, and avatar artwork.
- `ui/` — spacing/radius/shadow tokens, component contract, and visual UI kit.
- `assets/` — splash, partner badge, QR sign, decal, sticker, email, presentation, pattern, and motion assets.

## Logo selection

| Context | Asset | Minimum size |
|---|---|---:|
| Marketing/print header | `logos/logo-horizontal.svg` | 148 px wide |
| Product screens (web app) | composed lockup — see "Screen lockup" | mark 28 px tall |
| Narrow footer or sponsor row | `logos/wordmark.svg` | 112 px wide |
| Stacked composition | `logos/logo-vertical.svg` | 180 px wide |
| Square editorial tile | `logos/logo-square.svg` | 96 px |
| Circular profile placement | `logos/logo-circle.svg` | 64 px |
| UI icon 32–64 px | `logos/icon.svg` | 32 px |
| UI icon 16–24 px | `logos/icon-small.svg` | 16 px |
| One-color printing | `logos/logo-monochrome.svg` | 32 mm wide |
| Dark photography | `logos/logo-reverse.svg` | 148 px wide |
| App stores | `logos/app-icon.svg` | source only |
| Browser | `public/favicon.svg` and `public/favicon.ico` (generated) | native |
| Social profile | `social/social-avatar.png` | platform crop safe |

The clear-space unit is the width of the spark. Keep at least 2 units around the horizontal logo and 1.5 units around the icon. Do not rotate the mark, place it in a generic map pin, add glow, alter the path, recolor individual parts outside approved lockups, or combine it with the old Dotling/mascot artwork.

## Screen lockup

Product screens compose `logos/icon.svg` and `logos/wordmark.svg` at separate sizes through `src/components/brand/Logo.tsx`. The default mark uses a Midnight Navy tile so the ivory artwork stays visible on light backgrounds. The reverse mark is transparent, with ivory lettering for dark surfaces. The wordmark is tightly cropped vector artwork, with its approved letter shapes preserved rather than substituted with a font.

| Step | Mark box | Wordmark height | Gap | Use |
|---|--:|--:|--:|---|
| `sm` | 33 px | 20 px | 8 px | Narrow app chrome |
| `md` | 38 px | 24 px | 8 px | Site header and auth |
| `lg` | 46 px | 30 px | 10 px | Footer and branded screens |

The symbol remains separate from the lettering so both stay readable on 320 px screens. Explicit image dimensions reserve space before the assets load. `logo-horizontal.svg` remains the portable combined lockup for marketing and exports.

## Wordmark status

`logos/wordmark.svg` and `logos/wordmark-reverse.svg` are vector outlines traced from the approved final concept. They use navy and ivory respectively. Photo exports draw the reverse artwork through `src/lib/brand.ts`; they must not typeset a substitute. Campaign templates also embed these outlines. Ordinary headings and body text continue to use the existing type system.

## Color implementation

`colors/colors.json` includes every primitive as HEX, RGB, HSL, and a suggested CSS variable. Components should consume semantic aliases from `colors/tokens.css`. Preserve the meaning of progression colors:

- XP: Ocean.
- Points: Reward Gold.
- Rewards: Reward Gold for the earned value; Coral only to draw attention to it.
- Verified/success: Palm.
- Achievement: Reward Gold, reserved for earned milestones.

Never communicate status by color alone. Text labels and icons remain required.

## Favicon and app installation

The sources are `logos/app-icon.svg` (detailed rounded square), `app-icon-maskable.svg` (full-bleed with the emblem inside the central safe circle), `favicon.svg` (simplified matching silhouette and gold star for 16–48 px), and `mask-icon.svg` (one-color silhouette for Safari pinned tabs).

```
npm run assets:brand
```

This regenerates `favicon.ico`, `favicon.svg`, `favicon-16/32.png`, `apple-touch-icon.png`, `icon-192/512.png`, `icon-maskable-512.png`, `mask-icon.svg`, `og-image.png`, and the brand-kit PNG exports. The script serves assets over loopback HTTP and waits for images/fonts to decode; failed renders stop the export. Manrope and Inter Latin variable fonts and their licenses are bundled under `typography/fonts/` so exports do not require Google Fonts access. No npm dependencies were added.

Update the SVG sources and regenerate instead of editing shipped PNGs individually. The current browser/manifest/social references carry `?v=2` to refresh previously cached brand assets; increment this on the next identity change. The theme color remains `#0D1321`.

## Social usage

`open-graph-template.svg` is 1200 × 630. `twitter-template.svg` is 1600 × 900. Replace the dark right-hand photo placeholder with one approved editorial image while preserving text safe zones. Export PNGs at source dimensions. Keep headlines to two lines and never render live product UI in a social campaign image.

## Physical assets

- `assets/qr-sign.svg` is an 8.5 × 11 proportion template. Replace only the dashed QR safe area with a tested quest-specific code. Maintain at least four QR modules of quiet zone.
- `assets/window-decal.svg` is designed for a 5–8 inch circular print. Use opaque Warm Sand on clear glass or reverse it in white for dark glass.
- `assets/partner-badge.svg` may appear on partner sites and printed counter cards. It is not a certification seal.
- `assets/sticker.svg` includes a 12 px visual cut line; printers must add their required bleed separately.
- `assets/presentation-cover.svg`, `assets/email-header.svg`, and `assets/path-pattern.svg` are editable campaign templates.

## Accessibility and quality checks

- Keep body text at 16 px or larger.
- Preserve 4.5:1 contrast for normal text and 3:1 for large text/icons.
- Provide accessible names for meaningful icons; mark decorative SVGs `aria-hidden="true"`.
- Respect `prefers-reduced-motion` using `assets/motion.css`.
- Test the favicon at 16 and 32 px and the icon on both very light and very dark imagery.
- Optimize SVGs only if titles, view boxes, and currentColor behavior remain intact.

## Naming and governance

The public brand name is always `sidequests`, lowercase. File names use kebab-case. Token names use semantic intent. Add new assets to this README rather than creating a parallel brand guide. Any change to the doorway geometry, wordmark, primary palette, or progression-color meanings requires brand owner approval and a version note in this file.

Version: 2.0 · 2026-10-25 — Brand owner approved the generated ivory/gold emblem and blended playful wordmark in chat, then authorized site-wide implementation. Replaces the angular switchback and previous custom lettering. Artwork preparation retains the approved design; compact browser and pinned-tab icons use its vector silhouette. This entry records source changes, not a production deployment.
