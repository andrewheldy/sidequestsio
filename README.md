# SideQuests.io

Mobile-first QR quest platform — scan, explore, earn.

## Start here

Read [AGENTS.md](AGENTS.md) for shared contributor and coding-agent rules, then use the [documentation map](docs/README.md) to find the relevant source of truth. [CLAUDE.md](CLAUDE.md) points to the same rules rather than maintaining a duplicate manual.

The [web design brief](DESIGN_BRIEF.md) and [mobile reference images](docs/design/mobile/) remain active references. Old architecture planning and the one-off redesign prompt are identified in the [archive index](docs/archive/README.md); do not treat them as current implementation instructions.

## Tech stack

- **Vite + React + TypeScript**
- **shadcn/ui** — accessible component primitives
- **Tailwind CSS** — design system
- **Supabase** — auth + profiles
- **Mapbox GL JS** — interactive quest maps
- **React Router v6** — client-side routing

---

## Local setup

```sh
# 1. Clone
git clone https://github.com/andrewheldy/sidequestsio.git
cd sidequestsio

# 2. Install dependencies
npm install

# 3. Configure environment (see sections below)
cp .env.example .env
# Then fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_MAPBOX_PUBLIC_TOKEN

# 4. Start dev server
npm run dev
```

---

## Mapbox setup

The interactive quest map uses [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/).

### 1. Get a token

Sign in at [account.mapbox.com](https://account.mapbox.com/access-tokens/) and create
a **public** token (starts with `pk.`). Public tokens are safe to ship to the browser.

### 2. Add to `.env`

```
VITE_MAPBOX_PUBLIC_TOKEN=pk.your_token_here
```

### 3. Set on Vercel (production)

In Vercel → Project Settings → Environment Variables, add:

| Name | Value |
|------|-------|
| `VITE_MAPBOX_PUBLIC_TOKEN` | `pk.your_token_here` |

The map degrades gracefully when the token is missing — an info message is shown
instead of a blank screen.

---

## Supabase setup

### 1. Environment variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | The project's public **anon** key (safe for the browser) |

> Never put a `service_role` key in a `VITE_*` variable — it would be shipped to the browser.

### 2. Database

The schema is maintained in `supabase/migrations/`; the original single-profile migration is not a complete setup guide for the current application.

Follow the database and migration guardrails in [AGENTS.md](AGENTS.md). Verify the target environment and applied schema before proposing changes. The repository's agent database connection is read-only; migrations and imports must be handed to the user for an explicitly authorized, backed-up workflow. Do not run a blanket database push as part of repository cleanup.

### 3. Auth settings

Enable the **Email** provider in Supabase → Authentication. For local testing you
can disable "Confirm email"; leave it enabled in production.

---

## Deployment (Vercel)

The project includes `vercel.json` with a catch-all SPA rewrite so direct URL
access and page refresh work correctly on all routes.

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
```

Set all `VITE_*` environment variables in Vercel → Project Settings → Environment Variables.

---

## Map components

| Component | Location | Description |
|-----------|----------|-------------|
| `QuestMap` | `src/components/map/QuestMap.tsx` | Core Mapbox GL map |
| `UserLocationButton` | `src/components/map/UserLocationButton.tsx` | GPS button (tap-to-request) |
| `QuestMapPopup` | `src/components/map/QuestMapPopup.tsx` | Slide-up quest preview |
| `NearbyQuestsMapSection` | `src/components/map/NearbyQuestsMapSection.tsx` | Drop-in section with skeleton + empty state |
| `MapSkeleton` | `src/components/map/MapSkeleton.tsx` | Loading placeholder |

### Usage

```tsx
// Drop-in section (handles lazy loading, skeleton, empty state)
import { NearbyQuestsMapSection } from '@/components/map';

<NearbyQuestsMapSection
  quests={quests}
  title="Nearby Quests"
  subtitle="Tap a pin to preview."
  height="420px"
/>

// Or lazy-load QuestMap directly
const QuestMap = lazy(() => import('@/components/map/QuestMap'));
<QuestMap quests={quests} height="400px" />
```

### Privacy

- Location is **never** requested on page load — only when the user taps the ⊕ button.
- Coordinates are used only for local distance calculations; nothing is sent to any server.
- To add analytics, see the comment hook in `src/lib/mapbox.ts → calcDistance`.
