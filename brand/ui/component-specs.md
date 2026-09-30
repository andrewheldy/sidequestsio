# Product component specifications

These specifications are the implementation contract for the redesign. Measurements are CSS pixels at 1×. All interactive elements have a visible `:focus-visible` ring: 3 px Ocean 400 with a 2 px surface offset. The minimum touch target is 44 × 44.

## Buttons

Height 48 px by default, 40 px compact, 56 px hero. Horizontal padding is 20/16/24 px. Radius 12 px. Label uses Manrope 700 at 14 px. Primary is Midnight with Sand text; hover lifts 1 px and uses Midnight 800. Secondary is a transparent surface with a 1 px Neutral 300 border. Tertiary is text-only. Destructive uses Error. Loading preserves button width. Disabled uses Neutral 100/400 and has no shadow.

## Inputs, search, and filters

Inputs are 48 px high, radius 12 px, 1 px Neutral 300 border, 16 px body text, and 14 px vertical / 16 px horizontal padding. Labels sit above with 8 px gap. Helper/error copy sits 6 px below. Search uses a leading 20 px icon and a clear action at right. Filter chips are 40 px high pills; selected chips use Midnight fill, never a rainbow of category colors.

## Cards

Use 16 px radius and a 1 px quiet border; rely on spacing before shadow. Quest cards lead with a 4:3 image on mobile and 16:10 on desktop. The information order is title → venue/neighborhood → time/distance → reward row. XP uses Ocean; Points use Gold. Do not place more than two badges over photography. Partner cards use a 3:2 editorial photo, verified partner name, short value statement, and one action.

## Rewards and progression

Reward cards use a Sand 100 surface with a single Coral edge or icon; they must look tangible, not like financial tokens. XP bars are 8 px high, Midnight 10% track with Ocean fill, rounded ends, and tabular numeric labels. Points use a Gold dot plus the word “Points” until the concept is familiar. Achievement cards use one large illustration, title, earned date, and progress; no shield shapes.

## Badges

Height 24 px, 8 px horizontal padding, radius 999 px, 11 px/700 label. Difficulty badges are neutral with text labels. Status badges may use semantic tint backgrounds. Reward and XP badges always include their text label in assistive content.

## Navigation

Desktop marketing navigation is 72 px high and uses the horizontal lockup at 148–168 px wide. In-app bottom navigation is 72 px plus safe-area inset, with five items maximum. Active state uses Midnight/Ocean and a 2 px top indicator; inactive state is Neutral 500. The central Scan action may be 52 px but must not obscure content. Navigation labels are always visible.

## Modals, drawers, dropdowns, tabs

Desktop modal width is 480–640 px with 24 px padding and 24 px radius. Mobile tasks use a bottom drawer with a 16 px grabber zone and safe-area padding. Dropdown rows are 44 px. Tabs use an underline for dense content and pills only for small, mutually exclusive views. Filters on mobile live in a drawer; chosen filters remain visible as removable chips.

## Floating action button

Use only for Scan or Capture. It is 56 px, Midnight fill, Sand icon, 16 px from the viewport edge, and never coexists with another floating primary action.

## Quest completion

The sequence is a single scrollable result screen, not a multi-step celebration trap: verified check → quest title → XP increment → Points increment → unlocked reward if any → Capture → Community Note → return to Explore. The first confirmation appears in under 220 ms; number count-up finishes within 700 ms. Sharing is secondary and optional.

## Leaderboard

The MVP specification marks leaderboards out of scope. The visual pattern is retained only for future readiness: rank, avatar, name, completed quests, XP; no aggressive winner-takes-all framing. Do not mount it until product scope changes.

## Partner CTA blocks

Use Midnight background, concise proof-oriented copy, one real venue photograph, and a Gold primary action. Lead with measurable visits and engagement, not dashboard features. Radius 24 px; 32–48 px padding; one strong metric may appear as evidence.

## Responsive rhythm

Mobile page gutters are 20 px, tablet 32 px, desktop 48 px. Section spacing is 64/80/112 px. Dense app stacks use 16–24 px gaps; marketing stacks use 24–40 px. Keep one dominant action per viewport.
