# sidequests brand asset library

Production system for the approved “Unexpected” direction: a doorway into hidden real-world experiences. The doorway, path, and spark are a single narrative mark. The system is intentionally restrained so real places and people remain the hero.

## Quick start

1. Import `colors/tokens.css`, `typography/type-tokens.css`, `ui/ui-tokens.css`, and `assets/motion.css` once at the application root.
2. Use `logos/logo-horizontal.svg` as the default marketing header logo and `logos/icon-small.svg` below 32 px.
3. Use `icons/*.svg` with CSS `color`; the SVGs inherit `currentColor`.
4. Use `illustrations/*.svg` only for empty, loading, success, and onboarding states.
5. Use raster exports in `favicon/`, `social/`, and `assets/` for platforms that do not accept SVG.
6. Read `design-system.md` before translating the system into Tailwind or shadcn tokens.

## Folder map

- `logos/` — custom vector wordmark, primary lockups, compact marks, monochrome, reverse, outlined, and embossed versions.
- `icons/` — 27 product icons on a unified 24 px construction grid.
- `favicon/` — favicon SVG/ICO, mask icon, Apple touch icon, Android icons, app source icon, and manifest.
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
| Website header | `logos/logo-horizontal.svg` | 148 px wide |
| Narrow footer or sponsor row | `logos/wordmark.svg` | 112 px wide |
| Stacked composition | `logos/logo-vertical.svg` | 180 px wide |
| Square editorial tile | `logos/logo-square.svg` | 96 px |
| Circular profile placement | `logos/logo-circle.svg` | 64 px |
| UI icon 32–64 px | `logos/icon.svg` | 32 px |
| UI icon 16–24 px | `logos/icon-small.svg` | 16 px |
| One-color printing | `logos/logo-monochrome.svg` | 32 mm wide |
| Dark photography | `logos/logo-reverse.svg` | 148 px wide |
| App stores | `favicon/app-icon-1024.png` | source only |
| Browser | `favicon/favicon.svg` and `favicon/favicon.ico` | native |
| Social profile | `social/social-avatar.png` | platform crop safe |

The clear-space unit is the width of the spark. Keep at least 2 units around the horizontal logo and 1.5 units around the icon. Do not rotate the mark, place it in a generic map pin, add glow, alter the path, recolor individual parts outside approved lockups, or combine it with the old Dotling/mascot artwork.

## Wordmark status

`logos/wordmark.svg` and `logos/logo-horizontal.svg` contain custom vector geometry rather than live font text. The rounded terminals, open `e`, and angled `q` tail are intentional. Some secondary preview/template assets use Manrope text for portability; production brand signatures must use the vector wordmark file.

## Color implementation

`colors/colors.json` includes every primitive as HEX, RGB, HSL, and a suggested CSS variable. Components should consume semantic aliases from `colors/tokens.css`. Preserve the meaning of progression colors:

- XP: Ocean.
- Points: Reward Gold.
- Rewards: Coral, used sparingly.
- Verified/success: Palm.
- Achievement: Violet, reserved for earned milestones.

Never communicate status by color alone. Text labels and icons remain required.

## Favicon and app installation

Copy the contents of `brand/favicon/` into the public asset directory, preserving names. Reference the SVG favicon first, then ICO fallback, Apple icon, mask icon, manifest, and theme color `#0D1321`. Do not round `app-icon-1024.png` again on platforms that apply their own mask.

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

Version: 1.0 production candidate · 2026-07-15
