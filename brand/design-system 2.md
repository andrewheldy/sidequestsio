# sidequests production design system

## 1. Brand idea

**A doorway into the unexpected.**

sidequests makes a city feel newly discoverable. The doorway is the threshold, the path is the choice to move, and the spark is the memorable thing found on the other side. The mark deliberately avoids maps, pins, compasses, shields, coins, controllers, and fantasy symbols.

The production refinement preserves the approved moodboard while making it more useful:

- the arch is wider and optically centered;
- the legs terminate on a shared baseline;
- the path uses fewer, larger turns so it survives at 16 px;
- the spark is centered within the visual opening rather than the mathematical bounding box;
- the silhouette is one color by default and no longer depends on interior hairlines;
- the small mark increases negative space and removes one path turn;
- the wordmark is custom vector geometry with rounded terminals, open counters, and an angled `q` descender that echoes the path.

Personality: premium, modern, adventurous, minimal, trustworthy, playful, curious, local, intelligent. The premium feeling comes from restraint, editing, photography, and typography—not metallic effects or luxury clichés.

### Signature layout device

The one deliberate aesthetic risk is the **threshold crop**: a photograph or color field may enter through one oversized arch-shaped edge, as if the next scene is visible through a doorway. Use it once per major marketing page, never around ordinary cards, and never combine it with additional blobs or gradients. It turns the brand idea into structure rather than decoration. The Open Graph and presentation templates demonstrate the device.

## 2. Logo system

The primary signature is `logos/logo-horizontal.svg`. Use the icon alone only when the brand is already established in context. Use the wordmark alone in sponsor rows, editorial credits, or narrow layouts.

### Clear space and minimum sizes

Let **S** equal the width of the spark in the chosen lockup. Keep 2S clear space around a signature and 1.5S around the standalone icon.

| Asset | Digital minimum | Print minimum |
|---|---:|---:|
| Horizontal | 148 px wide | 32 mm wide |
| Wordmark | 112 px wide | 25 mm wide |
| Vertical | 180 px wide | 40 mm wide |
| Standard icon | 32 px | 8 mm |
| Small icon | 16 px | not recommended |
| Partner badge | 180 px wide | 45 mm wide |

### Approved colorways

- Light surface: Midnight mark.
- Dark or photographic surface: Sand/white reverse mark; the photo area behind it must remain quiet.
- One-color print: solid black or solid white.
- Reward Gold may color the spark only in app icons, social avatars, and controlled campaign lockups.
- Embossing/debossing uses a one-level solid die; never reproduce the preview’s lighting as printed color.

### Misuse

Do not stretch, rotate, outline the solid lockup, add a map pin, add a compass, fill the doorway with a photo, animate the entire logo continuously, typeset the wordmark from a font, use `SideQuests` or `SIDEQUESTS`, or use the mark beside the previous Dotling/mascot identity.

## 3. Color system

The palette starts from the moodboard’s six colors and adds ramps for accessible UI. The complete source of truth is `colors/colors.json`; every entry contains HEX, RGB, HSL, and the CSS variable. `colors/tokens.css` provides theme aliases.

### Core brand colors

| Token | HEX | RGB | HSL | CSS variable | Use |
|---|---|---|---|---|---|
| Midnight 900 | #0D1321 | 13, 19, 33 | 222 43% 9% | `--color-midnight-900` | Primary brand, dark surfaces |
| Ocean 500 | #2563EB | 37, 99, 235 | 221 83% 53% | `--color-ocean-500` | Discovery, links, XP |
| Sand 200 | #F2E8D5 | 242, 232, 213 | 39 53% 89% | `--color-sand-200` | Warm fields, physical material |
| Palm 500 | #2E7D5A | 46, 125, 90 | 153 46% 34% | `--color-palm-500` | Verified, success |
| Gold 500 | #F2B94B | 242, 185, 75 | 40 87% 62% | `--color-gold-500` | Points, earned highlight |
| Coral 500 | #FF6F61 | 255, 111, 97 | 5 100% 69% | `--color-coral-500` | Rewards, rare celebration |

### Semantic mapping

| Meaning | Light | Dark | Constraint |
|---|---|---|---|
| Page background | Sand 50 | Midnight 950 | Warm, never sterile pure gray |
| Surface | Neutral 0 | Midnight 800 | Raised surfaces use one step only |
| Text | Midnight 900 | Sand 50 | Never Ocean for paragraphs |
| Muted text | Neutral 600 | Neutral 300 | Check 4.5:1 for body copy |
| Border | Neutral 200 | Midnight 700 | Borders should recede |
| Primary action | Midnight 900 | Sand 100 | One primary action per view |
| Focus | Ocean 400 | Gold 500 | Always 3 px + 2 px offset |
| Disabled | Neutral 300 | Neutral 600 | Pair with disabled semantics |
| Success | Palm 500 | Palm 500 | Include icon and label |
| Warning | Gold 600 | Gold 500 | Do not confuse with Points; add label |
| Error | #D4473E | Coral 500 | Avoid large fields of red |
| XP | Ocean 500 | Ocean 400 | Non-spendable progress |
| Points | Gold 500 | Gold 500 | Spendable in-product currency |
| Reward | Coral 600 | Coral 500 | Tangible benefit, not token art |
| Achievement | #7C5CE7 | #7C5CE7 | Earned milestones only |

Gold fails for small text on light backgrounds; use Gold 700 for text or place Midnight text on Gold 500. Coral 500 is an accent, not the error text color on white. Never rely on hue alone.

## 4. Typography

Primary: **Manrope Variable**. Secondary: **Inter Variable**. Numeric utility: **IBM Plex Mono**. Exact sizes, weights, line heights, and letter spacing are in `typography/README.md` and `typography/type-tokens.css`.

Display headlines are short, left aligned, and tightly tracked. Product headings use the same family at smaller sizes. Body copy remains quiet and highly legible. XP, Points, QR codes, and redemption codes use tabular numbers; only compact values use mono.

The wordmark is not Manrope. It is the outlined vector in `logos/wordmark.svg`.

## 5. Icon family

The product family uses a 24 × 24 grid, 1.75 px stroke, 2 px safe area, round caps, and round joins. Icons inherit `currentColor`. Use 16 px in badges, 20 px in buttons, 24 px in navigation, and 32 px in feature/empty-state callouts.

The system contains Explore, Quest, Reward, XP, Points, Partner, Map, Profile, Achievement, Camera, Photo, QR, Settings, Search, Bookmark, Check-in, Directions, Hidden Gem, Event, Restaurant, Coffee, Art, Music, Outdoors, Nightlife, Scan, and Favorite.

Category icons communicate venue type. The brand doorway communicates sidequests itself. Do not use the brand icon as every quest/category icon.

## 6. Illustration language

Illustrations behave like editorial wayfinding diagrams: warm field, bold Midnight line, one functional accent, and generous empty space. They support comprehension and emotion without becoming mascots.

Use `illustrations/empty-state.svg`, `loading.svg`, `quest-completed.svg`, `new-city.svg`, `achievement-unlocked.svg`, `invite-friends.svg`, `no-quests-nearby.svg`, `404.svg`, `offline.svg`, and `partner-onboarding.svg`.

The doorway/path motif may appear in completion, onboarding, and city-unlock moments. Empty search results should emphasize a new path forward, not failure. Loading animation draws the path once; it does not loop a spinning logo indefinitely.

## 7. Photography art direction

Photography is the emotional center of the identity. Prioritize real people, real businesses, neighborhood texture, golden hour, weather, hands, imperfect human moments, arrivals, thresholds, and the instant someone notices something new.

### Shot list

- wide contextual street image with copy-safe negative space;
- medium arrival at a venue threshold;
- close detail of hands, menus, craft, food, art, or tickets;
- candid shared reaction after the discovery;
- proprietor or staff portrait in their actual environment;
- neighborhood connector image showing the walk between places.

### Treatment

Use natural contrast, slightly warm highlights, deep neutral shadows, realistic skin, and restrained saturation. Allow texture and grain. Crop people with room to move into the frame. Use dark overlays only where needed for text contrast.

Avoid stock business people, posed influencers, beaches as shorthand for Miami, saturated teal/orange grading, generic skyline-only imagery, tourism clichés, phone-first poses, fantasy glow, and visible third-party trademarks without clearance.

## 8. Layout and UI

Use the 8 px grid with 4 px micro increments. Mobile gutters are 20 px, tablet 32 px, desktop 48 px. Content max is 1200 px; reading max is 680 px. Marketing sections use 64/80/112 px vertical space. Product stacks use 16–24 px gaps.

Cards use 16–24 px radii depending on size, quiet borders, and limited shadow. Photography dominates quest cards. One primary action should win every viewport. Complete component rules are in `ui/component-specs.md`; `ui/ui-kit.svg` is a visual reference.

## 9. Motion direction

Motion expresses threshold, progress, and confirmation. It does not simulate a game HUD.

- Button hover: 140 ms, 1 px lift, no spring.
- Card hover: 220 ms, 2 px lift plus image scale to 1.015 on pointer devices only.
- Page enter: 220 ms fade/8 px rise; do not animate every child independently.
- Drawer/modal: 220 ms enter, 140 ms exit.
- XP: fill left-to-right in 600–700 ms after confirmation.
- Points: numeric increment after XP, within the same 700 ms result window.
- Reward unlock: one 420 ms scale/fade with restrained overshoot.
- Quest complete: check draws once, then content settles; no confetti by default.
- Loading: skeleton first; path-draw for branded waits above 600 ms.

All motion is disabled or reduced by `prefers-reduced-motion`. Never block navigation while celebration motion finishes.

## 10. Voice and naming

The brand speaks with intelligent curiosity: concise, specific, and inviting. Prefer “Something’s waiting here” over “Unlock epic rewards.” Prefer “Take the side street” over “Begin your journey.” Avoid gamer slang, hype, fantasy, passive tourism language, and SaaS jargon.

Always write `sidequests` in lowercase. XP is uppercase. Points is title case when naming the currency and lowercase when used generically in a sentence.

## 11. Website redesign audit

The audit is based on the mounted routes in `src/App.tsx` and current page implementations. It separates visual recommendations from route/product gaps.

### Home — `/`

Current reality: a centered rotating gradient headline, large ambient color blurs, old Dotling and mascot assets, emoji category art, multiple card grids, and remote stock photography. This mixes the previous playful identity with the approved premium direction.

Recommended: use a left-aligned two-column hero with one campaign statement, one primary CTA, one editorial Miami image, and a subtle doorway crop at the threshold. Remove the Dotling/privacy badge, mascot, rotating headline, emoji categories, and decorative gradients. Follow with: curated quests, the three-step physical loop (discover/visit/complete), one Community Note proof point, partner evidence, and one final CTA. Use Display/H1 typography, 112 px desktop section spacing, full-bleed imagery at intentional moments, and one 220 ms hero entrance. The hierarchy should feel like a campaign first and a directory second.

### Quest Detail — `/quests/:questId`

Current reality: the content order is strong and mobile focused—hero, summary/rewards, objective, completion, venue information, Community Notes—but the gradient completion button and mixed glow styling pull toward game UI.

Recommended: keep the order. Make the hero 56–64vh with a readable image gradient, place title and venue as a quiet lower caption, and move XP/Points into a clear reward strip immediately below. Give the objective a Sand field and label it “Your quest.” Replace the purple/coral gradient CTA with solid Midnight and a Palm verified state. Keep completion in a bottom drawer, then transition to the restrained completion sequence. Increase content gutter to 20 px, card gaps to 16 px, and use a sticky completion action only until completed. Venue actions should be plain, trustworthy utilities.

### Explore — `/app/explore`

Current reality: greeting, search, horizontally scrolling category pills, and a single-column live quest list. It is understandable but reads as a basic catalogue.

Recommended: lead with “What’s worth leaving the house for?” plus current neighborhood/location context. Add one featured quest with strong photography, then nearby and new sections. Keep search and existing simple categories; do not add speculative advanced filters. Offer a list/map toggle without hiding the list. Cards should surface image, title, venue, time/distance, XP, and Points in that order. Use 20 px gutters, 16 px card gaps, and skeletons that match card geometry. Category changes use an instant state change plus 140 ms content fade.

### Partner Landing — `/partnerships`

Current reality: a generic centered hero, five partner-type cards, benefit cards, process content, and a contact form. It describes categories more than business outcomes.

Recommended: use a split hero with a real proprietor/venue image, headline around turning a place into a destination, and one contact CTA. Replace the five equal type cards with three outcome blocks: qualified visits, measurable engagement, memorable guest experiences. Add one real quest example, a QR/decal application, the analytics metrics partners receive, and a short curated process. Keep creator/city language subordinate because Miami venue validation is the current stage. Use Midnight CTA sections, Gold actions, real metrics when available, and restrained count-up only once in view.

### About — no mounted route

Current reality: there is no `/about` route or About page in `src/App.tsx`. Mission material is spread across Home, Hosts, and Partnerships.

Recommended: do not add a route solely to satisfy a conventional sitemap. During Miami validation, place the mission, curation philosophy, and local commitment in a focused Home section or adapt `/hosts` if its purpose aligns. If an About route is formally added, structure it as mission → why real-world exploration matters → curation principles → Miami proof → team/contact; use documentary portraits and neighborhood imagery, not corporate bios. This is a scope decision before an implementation task.

### Profile — `/app/profile`

Current reality: the profile is mounted and contains progression and linked operational destinations; system-state documentation notes some linked partner/admin routes may be unreachable.

Recommended: treat the profile as an Adventure Log cover: avatar/name/level, XP progress, Points balance, completed quest count, recent memories, achievements, then settings. Remove dashboard-like metric grids where one strong stat and an editorial memory grid can work. Use Ocean for XP, Gold for Points, and achievement Violet sparingly. Keep personal media central. Do not visually promote unreachable partner/admin links.

### Rewards — source exists, route not mounted

Current reality: `src/pages/app/Rewards.tsx` exists, but `/app/rewards` is not mounted. The MVP includes reward-redemption foundation, while the product spec still treats complex future systems cautiously.

Recommended: finish route/product readiness before redesign implementation. The visual surface should feel like a curated perks shelf: available balance, nearby redeemable rewards, clear cost, expiry/terms, partner identity, and redemption history. Avoid a wallet, marketplace, coin imagery, prices that resemble trading, and scarcity pressure. Use tangible photography and Coral as a small reward signal; Gold remains Points. Redemption should use a confirmation drawer and a high-trust code state.

### Sign Up — `/auth` create-account tab

Current reality: signup and login share a centered form on an ambient gradient, display the old Dotling logo and `SideQuests.io`, and include clear legal consent controls.

Recommended: preserve the consent behavior and single-column mobile flow. Replace old identity with the horizontal/vertical lockup and one quiet Sand background. Use a split desktop layout only above 1024 px, with one authentic exploration image and a short benefit statement. Keep fields at 48 px, errors inline, password guidance visible, and primary action solid Midnight. Use `sidequests`, never `.io` in the product signature.

### Login — `/auth` sign-in tab

Current reality: the mode is a tab in the same form and shares the old visual treatment.

Recommended: make sign-in the default quiet state, with email, password, reset-password link, primary action, and a clear create-account alternative. Remove decorative gradient blobs. Keep the destination/deep-link behavior intact. Add no social providers unless product/auth requirements explicitly call for them. Motion is limited to a 140 ms mode crossfade and button loading state.

## 12. Priority sequence for redesign

1. Replace naming and identity in the global header, auth, favicon, and app chrome.
2. Map color/type/spacing tokens into the existing Tailwind/shadcn layer.
3. Rebuild quest cards and Quest Detail because they carry the core loop.
4. Reframe Home with editorial photography and fewer sections.
5. Align Explore, Profile, and completion states.
6. Reframe Partnerships around evidence and venue outcomes.
7. Resolve the About and Rewards route/scope decisions before building those pages.

This order supports the current Miami validation stage and avoids a broad visual rewrite detached from the discover → visit → scan → complete → capture → progress loop.

## 13. Product conflicts surfaced

- The current design document’s phrase “travel app meets your favorite game” is useful as historical context, but the approved direction explicitly rejects tourism and overt gaming cues. This system follows the newer approved direction.
- The requested Leaderboard component conflicts with `PRODUCT_SPEC.md`, which lists leaderboards out of MVP scope. A future visual rule exists in `ui/component-specs.md`, but it should not be mounted now.
- About is not a mounted page, and Rewards has source code but no mounted route. Their visual recommendations are conditional and do not authorize new product surface.
