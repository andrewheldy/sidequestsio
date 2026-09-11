# THE FEED — Independent Review Handoff

**Prepared for:** an independent reviewer who has not seen this codebase or run the prototype.
**Mode:** inspection only. No code, copy, styling, tests, commits, or PRs were changed to produce
this document. Every recommendation below is a *proposal awaiting approval* (see the approval
checkpoint at the end).
**Branch reviewed:** `claude/the-feed-mvp-b9jvnn` (commit `29bcb5b`, plus the uncommitted
docs/handoff/screenshot working tree).
**Prototype scope reminder:** self-contained React/Vite/Tailwind rider-tablet prototype. No
backend, database, Supabase, control center, or campaign engine — those were descoped by the task
addendum and are *not* treated as findings (`docs/work/DECISIONS.md §1`).

---

## 1. How this handoff was produced

A five-lens audit (brand, accessibility, content integrity, code correctness, UX) was run over the
repository, followed by an adversarial verification pass in which a second agent tried to *refute*
each finding against the actual code, screenshots, and the locked source-of-truth documents. Raw
findings: **34**. After verification: **31 confirmed** (several with corrected details), **3
rejected**. Each confirmed finding's file/line and test references were then re-checked by hand
against the current source for this document; the code excerpts below are quoted from the working
tree.

The audit was **not** re-run for this handoff and no new fixes were applied. This is a
consolidation and prioritization of already-completed, already-verified work.

---

## 2. Source-of-truth documents (authority order)

1. `docs/product/THE_FEED_PROJECT_CONTEXT.md` — product thesis, privacy, content principles.
2. `docs/product/THE_FEED_MVP_IMPLEMENTATION_GUIDE.md` — MVP requirements, testing, DoD.
3. `docs/brand/THE_FEED_BRAND_IDENTITY.md` — locked Pulse identity (Option 01).
4. `docs/brand/THE_FEED_BRAND_CONCEPT_01_PULSE.md` — concept board notes.
5. The supplied visual mockup (`docs/brand/THE_FEED_MOCKUP_REFERENCE.png`) — *visual direction*,
   explicitly not pixel-spec; the brand docs win where they conflict (task addendum).
6. `docs/work/DECISIONS.md` — records where the addendum deliberately overrode the guide.

When a finding and a source document disagree, the disagreement is called out in
[§7 Contradictions](#7-contradictions-between-the-audit-and-the-approved-direction).

---

## 3. Repository map — where the major UI systems live

```
src/
├─ App.tsx                    Router + provider stack (Prefs → Session → Player); SleepOverlay
├─ main.tsx                   React 19 <StrictMode> root
├─ brand/                     LOCKED brand — single source of truth
│  ├─ tokens.css / tokens.ts  Pulse color tokens (drift-guarded by scripts/check-brand-tokens.mjs)
│  └─ copy.ts                 product name, taglines, module copy, CTAs, sponsorship labels,
│                             prohibited-phrase list  ← screens are supposed to consume these
├─ data/                      Fictional seed content (all demo:true). news, entertainment, music,
│                             livePulse, community, sponsors, games (trivia bank), sidequests, types
├─ lib/                       Pure logic + React context
│  ├─ trivia.ts               trivia reducer/scoring (unit-tested)
│  ├─ handoff.ts / handoffClient.ts  opaque token gen/resolve + localStorage store
│  ├─ analytics.ts            anonymous in-memory events
│  ├─ player.tsx              simulated music player context
│  ├─ prefs.tsx               a11y prefs → <html> data-attrs (larger text / reduced motion / contrast)
│  ├─ session.tsx             anonymous session + sleep/wake
│  └─ useImpression / useClock / saved / qr / rand / format
├─ components/                Reusable UI (TopNav/ModuleHeader, FeedLogo, PulseWave, DestinationTile,
│                             EditorialHero, StoryCard, Chip, LivePulseRow, MusicPlayer,
│                             SponsoredCard, SponsorLabel, QrModal, Modal, TriviaGame, SideQuest*,
│                             HeaderControls, SleepOverlay, Toggle, Skeleton, EmptyState, Icon)
└─ screens/                   Route screens: Ride(Attract/Home), News, Music, Entertainment,
                              Joyride, Go (mobile continuation)

tests/e2e/    Playwright: rider-home, joyride, handoff, controls (18 tests, 1280×800)
src/**/*.test.ts   Vitest units: trivia, handoff, qr, data, brand, format (38 tests)
docs/screenshots/  12 captured views used as visual evidence below
```

**Routes** (`src/App.tsx`): `/ride` (attract→home), `/ride/news`, `/ride/music`,
`/ride/entertainment`, `/ride/joyride`, `/go/:token`, `*` → `/ride`.

---

## 4. Prioritized findings (top 12 accepted)

Severity key: **P0** prototype-breaking · **P1** important passenger UX / a11y / content / brand ·
**P2** polish / future. "Recommendation" fixes are proposals only — do not implement before approval.

The full confirmed set is 31 findings; the 19 not expanded here are listed in
[§6 Additional verified findings](#6-additional-verified-findings-accepted-not-in-the-top-12).

---

### P0 — prototype-breaking

Nothing crashes the delivered prototype in the standard `pnpm dev` / `pnpm preview` browser path;
it demos end-to-end. The one crash-class defect breaks only under restricted storage — which is
precisely the kiosk/tablet deployment target — so it is treated as P0 for that target.

#### F1 · `Send to my phone` throws under restricted storage (kiosk / quota) — **P0 (kiosk) / P1 (browser demo)**
- **Where:** `src/lib/handoff.ts:66` (`createLocalStorageStore.set`), reached by every send-to-phone
  handler (`HomeScreen`, `NewsScreen.sendStory`, `EntertainmentScreen.sendItem`,
  `JoyrideScreen.sendQuest`, `SponsoredCard`).
- **Why it matters:** the send-to-phone/QR handoff is a core vertical-slice step. The write path is
  unguarded while the read path is not, and `handoffClient.buildStore` only catches failures when
  *constructing* the store, not on later `setItem`.
- **Evidence (working tree):**
  ```ts
  // handoff.ts:61-67 — read is guarded, write is not
  return {
    get: (token) => read()[token],
    set: (record) => {
      const all = read()
      all[record.token] = record
      storage.setItem(KEY, JSON.stringify(all))   // throws on QuotaExceeded / locked-down profile
    },
  }
  ```
  A throw here propagates synchronously out of `sendToPhone()` inside the click handler *before*
  `setHandoff(...)` runs, so the QR modal never opens and the button appears dead. `src/lib/prefs.tsx:50`
  already wraps its own `setItem` in try/catch with the comment "Storage may be unavailable in
  kiosk/private modes" — the same environment, handled inconsistently.
- **Verifier correction:** modern Safari private mode no longer throws; the real triggers are
  `QuotaExceededError` (full/zero-quota) and locked-down kiosk/enterprise profiles.
- **Current test coverage:** none. `handoff.test.ts` uses the in-memory store, which never throws.
- **Recommendation:** wrap the `setItem` in try/catch and mirror the record into an in-memory `Map`
  so a failed persist still yields an in-session-resolvable token (mirrors `createMemoryStore`).
- **Required regression test:** unit test injecting a `Storage` stub whose `setItem` throws → assert
  `createHandoff` returns a record and `resolveHandoff` still resolves it in-session; e2e is optional.
- **Regression risk:** very low. Additive guard; the localStorage happy path is unchanged.

---

### P1 — important passenger UX / accessibility / content / brand

#### F2 · Community CTA is a complete dead end — **P1** (audit: ux/high)
- **Where:** `src/screens/NewsScreen.tsx:174-180` (the "Around Miami" community cards).
- **Why it matters:** community programming is a core product pillar
  (`THE_FEED_PROJECT_CONTEXT.md §2/§8`), and the addendum's design-quality checklist explicitly
  requires "No interaction leads to a dead end." This is the only fully interactive-looking control
  in the app that produces *zero* visible result.
- **Evidence:**
  ```tsx
  <button type="button"
    onClick={() => track('community_opened', { contentId: item.id })}  // in-memory only, no UI change
    className="mt-1 inline-flex min-h-11 cursor-pointer ... text-pulse-lime ...">
    {item.cta} · {item.org}
  </button>
  ```
  Every other CTA in the app (stories, SideQuests, sponsors) produces a visible result; this one does not.
- **Current test coverage:** `tests/e2e/rider-home.spec.ts` ("community announcements appear in news")
  asserts the section renders, but never activates the CTA — the dead end is untested.
- **Recommendation:** reuse the pattern already on this screen — `setHandoff(sendToPhone({ kind:
  'offer', slug: item.id, title: item.title, detail: `${item.blurb} · ${item.when} · ${item.org}` }))`
  to open the already-mounted `QrModal` — or, if no handoff is intended, demote to non-interactive
  text. Zero type changes for the `kind: 'offer'` route.
- **Required regression test:** e2e — tap a community CTA → assert the QR modal (or a confirmed
  state) appears.
- **Regression risk:** low. Reuses an existing, tested handoff path. (A new `community` handoff kind
  would additionally touch `handoff.ts:10` and `GoScreen.tsx:41-46`; the `offer` reuse avoids that.)

#### F3 · Live Pulse shows static placeholder data under an animated "LIVE" badge with no disclosure — **P1** (audit: content/high)
- **Where:** `src/components/LivePulseRow.tsx:23-33` on the Home screen (`docs/screenshots/02-home.png`).
- **Why it matters:** the strip pairs a pulsing dot + the word "Live" with actionable utility claims a
  rider could rely on — "MIA Airport — No major delays · departures normal", "I-95 South — Moderate
  near downtown" — all static demo values. This implies live, verified transit/traffic data and
  violates "No unsupported claims" (`THE_FEED_PROJECT_CONTEXT.md:443`). The data file's own comment
  says these are "never presented as verified live data" (`src/data/livePulse.ts:4`).
- **Evidence:**
  ```tsx
  <span className="... text-pulse-lime uppercase">
    <span className="h-1.5 w-1.5 rounded-full bg-pulse-lime"
          style={{ animation: 'feed-live-dot 2s ease-in-out infinite' }} />
    Live
  </span>
  ```
  No sample/demo qualifier appears on Home except inside the Settings popover (`HeaderControls.tsx:161`),
  which is behind a tap and does not offset the always-visible badge.
- **Verifier correction:** do **not** remove the "Live" wording — "Live-status indicators" and "Live
  dot" are *approved* motifs (`THE_FEED_BRAND_IDENTITY.md:346,358`). The fix is disclosure, not removal.
- **Current test coverage:** none for the claim (the strip's mere presence is asserted, not its honesty).
- **Recommendation:** attach a visible "sample" qualifier to the row (reuse `demoDisclosure.contentNote`,
  or a compact "sample" tag matching the player's "Río Neón · sample" pattern), leveraging the existing
  `demo:true` flags on `livePulseItems`.
- **Required regression test:** e2e/DOM — assert a sample/demo indicator is present in the Live Pulse row.
- **Regression risk:** low; additive copy. Keeps the approved live-dot motif.

#### F4 · JOYRIDE "by THE FEED" lockup never renders at the target resolution — **P1** (audit: brand/high)
- **Where:** `src/components/TopNav.tsx:60` (ModuleHeader subtitle), fed by `JoyrideScreen.tsx:98`.
- **Why it matters:** the identity mandates the module lockup "JOYRIDE / by THE FEED"
  (`THE_FEED_BRAND_IDENTITY.md §11`). The attribution is piggybacked into the decorative subtitle,
  which is gated behind Tailwind's `2xl` (1536px) breakpoint — so at the project's own 1280×800 target
  the header reads only "JOYRIDE" (`docs/screenshots/06-joyride.png`). `joyride.lockup.by` has no other
  consumer, making it dead copy at target resolution.
- **Evidence:**
  ```tsx
  {subtitle ? (
    <span className="hidden pl-1 text-[15px] text-static-gray 2xl:inline">{subtitle}</span>
  ) : null}
  ```
- **Verifier correction:** cite §11 only; drop the §14 "visually unrelated" citation — JOYRIDE fully
  shares the black/Pulse-Lime/display-type system.
- **Current test coverage:** none asserts the lockup text.
- **Recommendation:** render `joyride.lockup.by` as an always-visible part of the JOYRIDE title lockup
  (small "by THE FEED" line beside/under the title, or a dedicated lockup prop on `ModuleHeader`),
  keeping only the descriptive subtitle behind the `2xl` gate.
- **Required regression test:** e2e at 1280×800 — assert "by THE FEED" is visible on `/ride/joyride`.
- **Regression risk:** low; must not disturb the Home 1280×800 no-scroll layout (e2e already guards Home).

#### F5 · News browsing surfaces drop source attribution and freshness — **P1** (audit: content/medium)
- **Where:** `src/components/StoryCard.tsx:35-37` (tile variant), `src/screens/NewsScreen.tsx:107`
  (featured hero), `src/components/EditorialHero.tsx:45` (Home hero).
- **Why it matters:** a **locked** rule — "News must always retain source attribution and freshness
  metadata" (`THE_FEED_PROJECT_CONTEXT.md:62`; guide line 476). The "More top stories" tiles show only
  "{readMinutes} min read" — no source, no timestamp (`docs/screenshots/03-news.png`); both hero
  surfaces show source but omit the timestamp. The data exists on every story; only these render paths
  drop it.
- **Evidence:** the row variant already renders the correct pattern —
  `{story.source} · {timeAgo(story.publishedAgoMinutes)} · {story.readMinutes} min read`
  (`StoryCard.tsx:62`), and `timeAgo` is already imported — so the tile fix reuses an in-file pattern.
- **Current test coverage:** none asserts source/timestamp presence on tiles or heroes.
- **Recommendation:** give the tile meta the source + `timeAgo`; add `timeAgo(...)` to the two hero
  meta lines. Detail modal already shows full meta (partial mitigation, not sufficient for browse
  surfaces).
- **Required regression test:** e2e — assert a source name and a relative time appear on a top-stories
  tile.
- **Regression risk:** low; the tile has vertical room. Watch two-line truncation at 1024×600.

#### F6 · Trivia fun fact is factually wrong (cruise-ship side) — **P1** (audit: content/medium)
- **Where:** `src/data/games.ts:80` (`q-causeway`), rendered after every answer via `TriviaGame.tsx:272`.
- **Why it matters:** rider-verifiable falsehood in the flagship game. Heading east on the MacArthur
  Causeway, PortMiami's cruise terminals (Dodge Island, *south* of the causeway) are on the rider's
  **right**, not the left. The question's answer itself is correct; only the fun fact is wrong. (All
  other 11 questions/facts verified correct.)
- **Evidence:**
  ```ts
  funFact: 'The MacArthur passes the cruise port — look for ships on your left heading east.'
  ```
- **Current test coverage:** `trivia.test.ts` + `joyride.spec.ts` validate scoring/flow, not fact
  accuracy.
- **Recommendation:** change to "...on your **right** heading east", or a direction-neutral phrasing
  ("the cruise ships dock just south of the causeway").
- **Required regression test:** none required (content edit); optionally a data test asserting the
  string no longer says "left".
- **Regression risk:** none.

#### F7 · Sleep mode does not isolate the app — hidden UI stays keyboard/AT-operable — **P1** (audit: a11y/medium)
- **Where:** `src/components/SleepOverlay.tsx:7-19`, rendered after `<Routes>` in `App.tsx:30`.
- **Why it matters:** sleep is a mandated rider control ("Sleep control available from every primary
  rider screen", guide line 886). The overlay is an opaque button with no focus management and no
  `inert`/`aria-hidden` on the app behind it. Triggering sleep unmounts the focused control, dropping
  focus to `<body>`; the next Tab lands on the *hidden* app's first control (TopNav), not the wake
  button (last in DOM). A keyboard/switch-access rider can invisibly activate navigation or the
  send-to-phone modal under the black screen, with focus rings hidden; screen readers can virtually
  navigate the "sleeping" UI.
- **Evidence:**
  ```tsx
  export function SleepOverlay() {
    const { sleeping, wake } = useSession()
    if (!sleeping) return null
    return <button ... className="fixed inset-0 z-[70] ... bg-feed-black">Tap to wake</button>
  }
  ```
  `sleeping` is read only here and in `session.tsx` — nothing gates the app behind it.
- **Current test coverage:** `controls.spec.ts` ("sleep mode darkens...") checks the overlay appears
  and wakes on tap; it does not test that the app underneath is inert.
- **Recommendation:** focus the wake button on mount (ref + `useEffect`/`autoFocus`) and set `inert`
  (or `aria-hidden` + tabindex removal) on the routes wrapper while `sleeping` is true — consistent
  with the trap the project already ships in `Modal.tsx`.
- **Required regression test:** e2e — enter sleep, press Tab, assert active element is the wake button
  (or that background controls are not focusable).
- **Regression risk:** low; `inert` is well-supported in the pinned Chromium. Verify wake still works
  via keyboard.

#### F8 · Misleading & inert secondary controls (sponsor "View details", music cards, featured "Listen") — **P1** (audit: ux/medium ×3)
This is one cluster of three same-root defects: a control's label/appearance promises an action it
does not deliver. Governed by the addendum's "No interaction leads to a dead end / no dead ends."

- **F8a — Sponsor "View details" opens the Send-to-my-phone modal** (`src/data/sponsors.ts:52` →
  `SponsoredCard.tsx:44`). The JOYRIDE placement's `cta: cta.viewDetails`, but `SponsoredCard` wires
  the primary button to `onSendToPhone` unconditionally, and `QrModal` is titled "Send to my phone"
  (`QrModal.tsx:55`). So "View details" opens a modal literally headed "Send to my phone", and the
  card renders two differently-labelled buttons with identical behavior — violating SponsoredCard's
  own "one primary action" contract. *Recommendation:* set the placement's `cta` to `cta.sendToPhone`
  (auto-suppresses the duplicate ghost button via the guard at `SponsoredCard.tsx:47`) or add a real
  detail view.
- **F8b — Music cards are inert** (`src/screens/MusicScreen.tsx:13-...`). `MusicCardTile` is a plain
  `<div>` with no `onClick`, no hover/focus affordance — while the visually-identical `TrendingTile`
  on Entertainment *is* a button. Riders learn tiles are tappable, then hit dead cards. The vibe poll
  also over-promises ("One tap steers what plays next / the queue leans your way") while the vote is
  local state the simulated player never consumes. *Recommendation:* make cards buttons opening a
  small detail + Send-to-phone modal (reuse the Entertainment modal pattern); soften the poll copy to
  a preference framing *or* extend `PlayerContext` to act on the vote (it currently exposes only
  toggle/next/prev over a fixed queue — no jump-to-track).
- **F8c — Featured "Listen to summary" == "Read now"** (`src/screens/NewsScreen.tsx:113`). Both call
  `setOpenStory(featured)`; the simulated listen state only starts after a *second* tap inside the
  modal, so the first tap feels redundant. *Recommendation:* pass an `autoListen` intent into
  `StoryDetailModal` so one tap lands in the simulated listening state. **Note the test coupling:**
  `rider-home.spec.ts:44-46` opens the featured story then clicks the in-modal listen button expecting
  the note to appear — that assertion must be updated alongside `autoListen`.
- **Current test coverage:** none targets F8a/F8b; F8c is indirectly coupled to the test above.
- **Regression risk:** low for F8a/F8c; F8b's player wiring is a small `PlayerContext` extension —
  prefer the copy-softening + detail-modal route to avoid touching playback for this milestone.

#### F9 · Trivia auto-advance ignores the OS `prefers-reduced-motion` setting — **P1** (audit: a11y/medium)
- **Where:** `src/components/TriviaGame.tsx:55`.
- **Why it matters:** the component doc and `global.css:139` both promise reduced-motion coverage via
  "system preference OR in-app setting", but the 4-second timed content change is gated on the in-app
  toggle only. A rider whose OS reduced-motion is set (and who never opens the Access panel) still gets
  feedback + fun fact force-advanced. CSS media queries can't cancel a JS `setInterval`.
- **Evidence:**
  ```ts
  const autoAdvancing = state.phase === 'feedback' && !prefs.reducedMotion  // OS signal ignored
  ```
- **Verifier note:** framing this as a WCAG 2.2.1 *failure* is overstated — the always-visible "Next
  question" button and the toggle both bypass the timer. The precise defect is the **contract
  mismatch** the code itself advertises.
- **Current test coverage:** `joyride.spec.ts` ("auto-advance is disabled when reduced motion is on")
  covers the *in-app* toggle only; the OS signal path is untested.
- **Recommendation:** add a small `useReducedMotion` hook (`matchMedia('(prefers-reduced-motion:
  reduce)')` + change listener) and gate on `!prefs.reducedMotion && !systemReduced`.
- **Required regression test:** e2e with the emulated `prefers-reduced-motion: reduce` media → assert
  no auto-advance countdown.
- **Regression risk:** low. Keep the existing in-app-toggle test green.

#### F10 · No live regions — trivia feedback/score is silent to screen readers — **P1** (audit: a11y/medium)
- **Where:** `src/components/TriviaGame.tsx:250` (feedback panel); no `aria-live`/`role=status`
  anywhere in `src/`.
- **Why it matters:** after a rider answers, "Correct!/Not quite", points, and the countdown all render
  silently; answer buttons are `disabled` during feedback (dropping focus — see F-list §6 C12) and the
  question auto-advances 4s later. A screen-reader rider hears nothing and the question changes under
  them — the core game loop is unplayable non-visually.
- **Verifier correction:** do **not** wrap the whole feedback container in `role="status"` — the
  1-second countdown re-render would spam announcements. Wrap only the result text (Correct/Not quite +
  points/correct answer), or use a dedicated visually-hidden status node updated once per answer.
- **Current test coverage:** none (no SR assertions in the suite).
- **Recommendation:** add a scoped `role="status"` live region for the trivia result; optionally extend
  to the "Playing audio summary" note and the vibe "Locked in" line (both partially mitigated today).
- **Required regression test:** DOM test asserting a polite live region carries the result text and is
  not re-rendered by the countdown tick.
- **Regression risk:** low; announcement scope must exclude the countdown.

---

### P2 — polish / future

#### F11 · "Larger text" toggle is a no-op on ~half the copy (the densest half) — **P2** (audit: ux/medium)
- **Where:** `src/styles/global.css:46` (`html[data-text-scale='large'] { font-size: 112.5% }`).
- **Why it matters:** the mechanism only scales rem-based sizes. The codebase mixes ~82 rem-based
  classes (which scale) with 83 px-literal `text-[13px]`-style sizes (which don't) — and the
  non-scaling half is disproportionately the smallest, densest copy the feature exists for (card
  metadata, Live Pulse detail, sponsor labels, trivia progress), much of it already below the brand
  doc's 18px practical minimum. Adjacent text on the same surface scales inconsistently (trivia answers
  grow; the 13px progress line doesn't).
- **Current test coverage:** `controls.spec.ts:30` only checks the `<html>` attribute flips, not that
  text actually grows.
- **Recommendation:** convert px-literal font sizes to rem equivalents (or add
  `html[data-text-scale='large']` overrides for the small-text classes).
- **Required regression test:** DOM test asserting a representative px-literal element's computed
  font-size increases when `data-text-scale='large'`.
- **Regression risk:** medium-*mechanical* — touches ~20 files; batch carefully and re-screenshot
  1280×800 / 1024×600 to confirm no reflow/scroll regressions.

#### F12 · One Escape press closes every stacked modal — **P2** (audit: code/medium)
- **Where:** `src/components/Modal.tsx:36-40` — each Modal adds a capture-phase `document` keydown
  listener; Escape calls `stopPropagation()` + `onClose()`.
- **Why it matters:** `stopPropagation()` doesn't stop *other* listeners on the same target
  (`document`), so with two modals mounted (shipped in `NewsScreen`/`HomeScreen` story+QR, and
  `EntertainmentScreen` detail+trailer/QR) one Escape runs both handlers and closes both layers at
  once; the expected behavior is dismissing only the topmost.
- **Verifier correction:** focus does **not** drop to `<body>` (tree-order cleanup restores the
  page-level opener) — the real defect is that the intermediate layer is skipped.
- **Current test coverage:** `controls.spec.ts:69` covers single-modal Escape only.
- **Recommendation:** maintain a module-level stack of open modals; handle Escape/Tab only for the top
  of the stack.
- **Required regression test:** e2e — open story→QR, press Escape once, assert only QR closed and the
  story detail remains.
- **Regression risk:** low-medium; central to all modals — re-run the modal e2e tests.

---

## 5. Rejected / unverified findings (do not act on)

| # | Finding (lens) | Why it should not be acted on |
|---|----------------|-------------------------------|
| R1 | "What Miami is playing" card fabricates fleet data / false "Updated weekly" (content) | **Refuted.** Fake freshness metadata on seeded demo content is the *mandated* pattern (`PROJECT_CONTEXT.md:62`) — news `publishedAgoMinutes`, Live Pulse values, and the adjacent "18 tracks · 1 hr 4 min" card all do the same. "what Miami is listening to" is locked positioning (`BRAND_IDENTITY.md:521`) and needs only the anonymous vehicle/interaction signals §9 already allows. Disclosure is covered by the MusicScreen "Sample tracks and metadata only" line + the global demo note. Acting on it would make one card inconsistent with the docs-mandated approach. |
| R2 | Modal focus trap leaks when focus is on `<body>` (code) | **Refuted.** The dialog wrapper has `tabIndex={-1}` (`Modal.tsx:80`), so clicking non-interactive content focuses the dialog, not `<body>`; forward Tab from the dialog proceeds into its own descendants (the close button), and Shift+Tab from the dialog is explicitly handled. The one component that disables a focused control mid-flow (TriviaGame) renders inline, not inside a Modal. The described escape is unreachable in current code. |
| R3 | "Happening nearby" rows styled interactive but static (ux) | **Refuted.** Lime-semibold text is not an interactivity affordance in this system — the brand doc reserves Pulse Lime for "current content" accents and the app uses lime-semibold non-interactive text pervasively (eyebrows, scores, "Reward ·"). Genuine buttons signal via Button chrome/cursor/hover-border, which these rows lack. The "duplicates tappable content" claim is also wrong in the default "For you" view (the one exact duplicate is only reachable under the Culture filter). The nearby list is a completed informational list per `HANDOFF.md`/`NOW.md` scope. |
| R4 | Idle "Tap anywhere to begin" should be "Tap to start" (brand, **partial**) | **Reject the copy-change half.** "Tap anywhere to begin" is *addendum-mandated* and test-pinned (`docs/work/DECISIONS.md §5`). See [§7](#7-contradictions-between-the-audit-and-the-approved-direction). *(The finding's other half — no sleep control on the idle screen — is retained as a low-priority item in §6.)* |

---

## 6. Additional verified findings (accepted, not in the top 12)

These 19 were confirmed by the verification pass but ranked below the top 12. Listed compactly so
nothing is lost; each still merits the same evidence/fix/test treatment if pulled into a batch.

| ID | Sev | Finding | Location |
|----|-----|---------|----------|
| C2 | P2 | Attract screen hand-builds a two-tone "The **FEED**" wordmark (FEED in lime) and hardcodes the essence line instead of using `FeedLogo` / `product.essence` (identity §4: white wordmark). *Note mockup tension — see §7.* | `screens/AttractScreen.tsx:49-55` |
| C1 | P2 | No sleep affordance on the idle/attract screen; `idleScreen.secondaryAction` is dead code; `HeaderControls` hardcodes "Sleep screen" | `AttractScreen.tsx`, `HeaderControls.tsx:158` |
| C3 | P2 | Sponsorship-label strings hardcoded in 4 send-to-phone payloads instead of built from `sponsorshipLabels[...]` (drift risk to the rider-facing QR/`/go` disclosure) | `JoyrideScreen.tsx:85,125`, `HomeScreen.tsx:67`, `EntertainmentScreen.tsx:182` |
| C4 | P2 | Attract ambient glows use raw `rgba(97,169,255…)` (Info semantic) + `rgba(159,139,255…)` (dusk art tint) as UI chrome — outside the token system and the CardArt-only exception | `AttractScreen.tsx:32-33` |
| C5 | P2 | `joyride.subtitle` "Games for the ride. Fun for everyone." is invented copy; approved `joyride.line` "Play the ride." is dead code; "…for everyone" paraphrases banned "Something for everyone" | `brand/copy.ts:50` |
| C6 | P2 | `'Happening nearby'` and `'THE FEED'` hardcoded instead of `communityLabels.happeningNearby` / `product.name` (case mismatch masked by CSS uppercase) | `EntertainmentScreen.tsx:157`, `MusicScreen.tsx:102` |
| C7 | P2 | Three 44px tap targets vs the brand's 48px mandate (`min-h-11`) — chips, community CTA, "Back to the ride" | `Chip.tsx:15`, `NewsScreen.tsx:177`, `GoScreen.tsx:121` |
| C9 | P2 | `role="radio"` groups (News/Entertainment chips, vibe poll) lack roving-tabindex/arrow-key behavior; each adds extra tab stops | `Chip.tsx:12`, `EntertainmentScreen.tsx:102`, `MusicScreen.tsx:77` |
| C12 | P2 | Keyboard focus drops to `<body>` when answer buttons become `disabled` in feedback phase (compounds F10) | `TriviaGame.tsx:206` |
| C13 | P2 | Header control panels don't restore focus to their trigger on Escape/backdrop close (only when focus moved into the panel) | `HeaderControls.tsx:42` |
| C17 | P2 | Hardcoded "Trending" labels assert popularity with no engagement data (hero prefix; "Trending now" shelf is `items.slice(1)`; a `tag:'Trending'`) | `EditorialHero.tsx:32`, `EntertainmentScreen.tsx:198`, `data/entertainment.ts:56`, `data/types.ts:47` |
| C18 | P2 | Sponsored SideQuest card chip shows the label but omits "Demo sponsored placement" on first impression (only in the modal) — the one sponsored surface lacking the disclosure at impression time | `SideQuestCard.tsx:31` |
| C19 | P2 | Player interval calls `setTrackIndex` inside the `setPositionSec` updater → impure; under StrictMode dev, end-of-track skips a track (dev-only; prod correct) | `lib/player.tsx:34` |
| C22 | P2 | `session.start` runs `rotateAnalyticsSession()`/`track` inside a setState updater → StrictMode dev double-invocation doubles `session_started` + orphans a session id (dev-only) | `lib/session.tsx:25` |
| C23 | P2 | `resolveToken` (which fires `track('handoff_opened')`) runs in `useMemo` during render → double-count under StrictMode dev; render-purity violation | `screens/GoScreen.tsx:17` |
| C24 | P2 | `STROKE_PATHS`/`FILL_PATHS` typed `Record<string,string>` collapses `IconName` to `string`, disabling compile-time icon-name checking (fix needs internal-lookup narrowing too) | `components/Icon.tsx:57` |
| C29 | P2 | Copy: "Check the link from the **THE FEED** tablet" (doubled article) on the invalid-token screen | `screens/GoScreen.tsx:113` |
| — | P2 | (F8c is tracked under F8) featured "Listen to summary" == "Read now" | `NewsScreen.tsx:113` |

---

## 7. Contradictions between the audit and the approved direction

1. **Idle primary copy (R4).** The audit's brand lens flagged "Tap anywhere to begin" as an
   unapproved rewrite of the identity's "Tap to start" (§10). This is **correct against the brand doc
   but wrong against the governing instruction**: the task addendum explicitly required "Tap anywhere
   to begin", and `docs/work/DECISIONS.md §5` records the addendum as the later, more-specific
   authority. The copy is also test-pinned. → **Do not change it.** Only the *sleep-on-idle* sub-point
   (C1) is retained.
2. **Live/Trending motifs (F3, C17).** The Live Pulse fix must **not** strip the "Live" wording or
   pulsing dot — those are approved Pulse motifs (`BRAND_IDENTITY.md:346,358`). The defect is the
   missing *disclosure*, not the motif. (The "Trending" labels in C17 are different: they assert
   popularity with no data and *should* be renamed.)
3. **Two-tone wordmark (C2) vs the mockup.** The identity says "white wordmark, lime mark only" (§4),
   but the supplied mockup renders "FEED" with a distinct treatment. Because the addendum makes the
   **brand docs authoritative over the mockup**, C2 is accepted — but the reviewer should confirm
   design intent before changing the flagship idle wordmark, since it is the most visible brand surface.
4. **Seeded freshness metadata (R1).** The audit's instinct to flag fabricated freshness ("Updated
   weekly") runs against the guide's explicit requirement that seeded demo content *retain* realistic
   freshness metadata. The honest-labeling requirement is satisfied by disclosure (F3), not by
   stripping metadata from the mock dataset.

---

## 8. Commands to run the prototype and its checks

```bash
pnpm install                 # dependencies (pnpm 10, Node 22)

pnpm dev                     # http://localhost:5173/ride   (dev; StrictMode double-invoke active)
pnpm build && pnpm preview   # http://localhost:4173/ride   (production build; what e2e runs against)

pnpm lint                    # ESLint 10 (expect 0 errors; 3 accepted react-refresh warnings)
pnpm typecheck               # tsc -b, strict
pnpm test                    # scripts/check-brand-tokens.mjs (token drift) + 38 Vitest unit tests
pnpm test:e2e                # Playwright, 18 tests, 1280×800; launches /opt/pw-browsers/chromium
                             #   override browser with PW_CHROMIUM_PATH=<path>
```

**Baseline at review time:** lint clean (3 warnings), typecheck clean, 38/38 unit, 18/18 e2e, build
succeeds. Several findings above note that these green checks do **not** cover the defect (e.g. the
kiosk-storage throw, the dead community CTA, SR announcements, OS reduced-motion) — the required
regression tests per finding are what close those gaps.

---

## 9. Proposed implementation sequence (planning only — do not execute)

Three batches, ordered to front-load trust/safety and de-risk the shared components. **This is a plan
for discussion, not an instruction to build.** Nothing here may start before the approval checkpoint.

**Batch A — trust, safety & correctness (F1, F2, F3, F6, F7)**
Highest-impact, mostly low-risk, each independently shippable: guard the handoff write (F1); fix the
community dead end (F2); disclose the Live Pulse sample data (F3); correct the trivia fact (F6);
isolate the app under sleep (F7). Land the F1/F2/F7 regression tests in the same batch.

**Batch B — accessibility & brand-visibility (F4, F9, F10, F8, plus C7, C9, C12, C13)**
The keyboard/SR and lockup-visibility work that shares the `TriviaGame`, `ModuleHeader`, `Chip`, and
`HeaderControls` components — grouped so those components are touched once. Include the OS
reduced-motion hook (F9), the trivia live region (F10), the JOYRIDE lockup (F4), the
misleading/inert controls (F8), and the cheap a11y quick-wins (44px targets, radio pattern, focus
restoration).

**Batch C — polish, purity & centralization (F11, F12, plus C2–C6, C17–C24, C29)**
Mechanical and lower-risk-in-aggregate but higher-churn: the larger-text rem migration (F11,
re-screenshot after), the modal Escape stack (F12), the StrictMode purity trio (C19/C22/C23), the
`IconName` type tightening (C24), brand-string centralization (C3/C5/C6), attract wordmark/glow
(C2/C4 — pending the design confirmation in §7.3), and the copy/label nits (C17/C18/C29).

Re-run `lint · typecheck · test · test:e2e · build` after each batch, and re-capture the 1280×800 /
1024×600 screenshots after Batch A (F3) and Batch C (F11) since both change on-screen density.

---

## 10. Approval checkpoint

> **No implementation may begin until Heldy approves this prioritized remediation plan.**

This document is inspection-only output. To proceed, Heldy should confirm:

1. **Scope** — which of the 12 prioritized findings (and which, if any, of the 19 in §6) are in.
2. **P0 framing** — accept treating F1 (storage throw) as P0-for-kiosk / P1-for-browser, or reflag.
3. **Contradictions (§7)** — confirm R4 stays rejected (keep "Tap anywhere to begin"), F3 keeps the
   Live motif + adds disclosure, and C2's two-tone wordmark change is desired (design sign-off).
4. **Batching** — approve the A→B→C sequence or reprioritize.

On approval, each accepted finding is implemented **with its required regression test**, validated
against the full check suite, and committed to `claude/the-feed-mvp-b9jvnn`. Until then, the working
tree is left unchanged.
