# Campaign, platform, and physical assets

| Asset | Source size | Use | Export note |
|---|---:|---|---|
| `app-splash.svg/.png` | 1290 × 2796 | Mobile splash artwork | Keep critical art inside center 60% |
| `loading-animation.svg` | 160 × 160 | Branded wait state over 600 ms | Honors reduced motion |
| `partner-badge.svg/.png` | 720 × 240 | Partner website/counter card | Do not imply certification |
| `qr-sign.svg` | 816 × 1056 | US Letter counter sign | Replace only QR safe area; test at print size |
| `window-decal.svg` | 720 × 720 | 5–8 inch circular decal | Add printer bleed/cut path externally |
| `sticker.svg` | 600 × 240 | Promotional sticker | 12 px visual cut line is not production bleed |
| `email-header.svg/.png` | 1200 × 360 | CRM/email header | Keep important text in left 70% |
| `presentation-cover.svg/.png` | 1920 × 1080 | Pitch deck cover | Replace subtitle per deck |
| `path-pattern.svg` | 320 × 320 | Subtle dark campaign pattern | Tile at 320 px; maximum 30% opacity |
| `motion.css` | n/a | Shared motion variables/keyframes | Import after base tokens |

SVG is the master for all printable and editable work. The included PNGs are convenience exports. Re-export from SVG after changing text or dimensions.
