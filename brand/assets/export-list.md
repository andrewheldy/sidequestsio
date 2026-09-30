# Implementation export checklist

## Web identity

- `logos/logo-primary.svg`
- `logos/logo-horizontal.svg`
- `logos/logo-vertical.svg`
- `logos/wordmark.svg`
- `logos/icon.svg`
- `logos/icon-small.svg`
- `logos/logo-square.svg`
- `logos/logo-circle.svg`
- `logos/logo-light.svg`
- `logos/logo-dark.svg`
- `logos/logo-monochrome.svg`
- `logos/logo-reverse.svg`
- `logos/logo-outlined.svg`
- `logos/logo-solid.svg`
- `logos/logo-embossed.svg`
- `logos/logo-small.svg`

## Browser and application

Browser and app icons are not exported by hand. `node scripts/generate-brand-assets.mjs`
renders them from `logos/app-icon.svg`, `logos/app-icon-maskable.svg` and
`logos/mask-icon.svg` straight into `public/`:

- `public/favicon.ico` (16/32/48)
- `public/favicon.svg`
- `public/favicon-16.png`, `public/favicon-32.png`
- `public/apple-touch-icon.png` (180)
- `public/icon-192.png`, `public/icon-512.png`
- `public/icon-maskable-512.png`
- `public/mask-icon.svg`
- `public/og-image.png` (1200 × 630)
- `assets/app-splash.svg/.png`
- `assets/loading-animation.svg`

## Social and communications

- `social/social-avatar.svg/.png`
- `social/open-graph-template.svg/.png`
- `social/twitter-template.svg/.png`
- `assets/email-header.svg/.png`
- `assets/presentation-cover.svg/.png`
- `assets/path-pattern.svg`

## Partner and physical

- `assets/partner-badge.svg/.png`
- `assets/qr-sign.svg`
- `assets/window-decal.svg`
- `assets/sticker.svg`

## Product system

- `colors/colors.json`
- `colors/semantic-colors.json`
- `colors/tokens.css`
- `typography/type-tokens.css`
- `ui/ui-tokens.css`
- `ui/component-specs.md`
- `icons/*.svg`
- `illustrations/*.svg`
- `assets/motion.css`
