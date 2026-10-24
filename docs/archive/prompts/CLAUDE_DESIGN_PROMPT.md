You are acting as the lead product designer, brand designer, conversion strategist, and senior frontend design engineer for SideQuests.

Your assignment is to overhaul the website and web-app experience at:

https://miamisidequests.io

You have access to the connected GitHub repository. The repository, its documentation, current production behavior, existing database integrations, and established product rules are the technical source of truth.

Do not begin by making visual changes.

First inspect the repository, current website, available design assets, product documentation, existing routes, reusable components, data models, responsive behavior, and the current state of the application.

Product context

SideQuests transforms real-world exploration into a game.

Users discover quests at local businesses, landmarks, events, and community locations; travel to the location; scan a QR code; complete an objective; capture the moment; earn XP and Points; unlock achievements and rewards; leave Community Notes; and build a persistent Adventure Log.

The product combines elements of:

* Real-world discovery
* Local recommendations
* Gamification
* Geocaching
* Social experiences
* QR-powered activations
* Rewards and progression

The initial launch market is Miami.

The long-term vision is to become the operating system for real-world adventures.

SideQuests is a B2B2C platform:

1. Consumers use the product to find and complete quests.
2. Local businesses use quests to drive verified visits, engagement, reviews, social sharing, reservations, orders, and repeat traffic.
3. Brands, festivals, conferences, universities, cities, and major events may eventually use SideQuests for larger activations.

Primary audiences

Explorer

A local resident or visitor looking for something interesting to do.

They should immediately understand:

* What SideQuests is.
* Why it is more engaging than a normal city guide.
* How quests work.
* What they can earn.
* How to start exploring.
* Why the experience is credible and safe.

Potential partner

A restaurant, bar, retailer, venue, attraction, event organizer, or brand.

They should understand:

* How SideQuests drives measurable physical visits.
* How quests create more meaningful engagement than passive advertising.
* What actions can be measured.
* How rewards work.
* How a business can become a partner.
* Why participation is easy and low-friction.

Returning user

An existing user who wants to:

* Find nearby quests.
* View a map.
* Resume their activity.
* Scan a quest QR code.
* Review XP, Points, achievements, rewards, and quest history.

Overall objective

Create a distinctive, high-conversion, mobile-first design system and website that makes SideQuests feel like a real consumer exploration product—not a generic startup landing page, tourism directory, coupon app, or cryptocurrency project.

The new experience should communicate:

“Miami is full of hidden adventures. SideQuests gives you a reason to go find them.”

The experience should feel:

* Adventurous
* Energetic
* Curated
* Local
* Playful
* Social
* Slightly mysterious
* Premium enough for brand partnerships
* Accessible enough for everyday users
* Credible enough for local businesses

Important visual direction

Develop a visual identity informed by Miami without falling into predictable Miami clichés.

Use Miami as environmental inspiration:

* Warm daylight and sunset contrast.
* Art Deco geometry.
* Tropical color used selectively.
* Local textures and street energy.
* Neighborhood-level photography.
* Maps, routes, markers, stamps, discoveries, and collected memories.
* Nightlife and daytime exploration.
* A sense of hidden access and local knowledge.

Avoid:

* Generic pastel Miami tourism branding.
* Excessive pink-and-teal gradients.
* Crypto, Web3, token, casino, or gambling aesthetics.
* Corporate SaaS dashboard styling on consumer pages.
* Generic AI-generated beige layouts.
* Cream backgrounds paired with orange serif headlines.
* Unnecessary ticker bars.
* Excessive pill-shaped elements.
* Excessive glowing cards.
* Excessive rounded rectangles.
* Random decorative dots.
* Generic stock photography.
* Fake testimonials.
* Fake partner logos.
* Fake usage statistics.
* Unsupported claims.
* Copy that sounds like “revolutionize,” “unlock endless possibilities,” or generic AI marketing language.

Do not merely swap colors on the current website. Reconsider hierarchy, page composition, navigation, storytelling, interaction, and conversion flow.

Design principles

1. Show the product

The interface should demonstrate the SideQuests experience rather than relying on paragraphs to explain it.

Use realistic product views such as:

* Quest cards.
* Neighborhood filters.
* Map discovery.
* Quest details.
* Objective.
* Difficulty.
* Distance.
* XP.
* Points.
* Reward.
* Scan flow.
* Completion moment.
* Adventure Log.
* Community Notes.

Use realistic data from the repository wherever possible.

2. Mobile first

The product will commonly be used while people are walking through Miami.

Design for:

* One-handed use.
* Outdoor readability.
* Fast scanning.
* Thumb-friendly controls.
* Clear navigation.
* Visible primary actions.
* Strong loading, error, empty, disabled, and success states.
* Safe-area handling.
* Responsive behavior from compact phones through desktop.

Mobile must not look like a compressed desktop website.

3. Make the core loop obvious

The primary loop is:

Discover → Go → Scan → Complete → Capture → Earn → Share → Remember

The website and app should teach this loop quickly and visually.

4. Separate consumer and partner journeys

Do not force both audiences through the same generic narrative.

Create clear pathways for:

* Explore Miami.
* How it works.
* Become a partner.

The consumer journey should lead toward exploring quests or signing up.

The partner journey should lead toward partnership interest or onboarding.

5. Use progressive disclosure

Do not place the entire product explanation above the fold.

The homepage should establish:

* What it is.
* Why it is interesting.
* Where it is launching.
* What action to take.

Then reveal mechanics, rewards, social proof, neighborhoods, partner value, and FAQs progressively.

6. Protect trust

Clearly distinguish:

* XP as long-term progression.
* Points as an in-product reward currency.
* Business rewards.
* Quest completion requirements.
* User-generated Community Notes.
* Partner-provided information.

Do not introduce blockchain, token cash-out, speculative economics, or future concepts that are outside the current MVP.

Required discovery phase

Before implementing anything, perform a structured audit.

Inspect:

* Framework and build tools.
* Component architecture.
* Styling approach.
* Existing design tokens.
* Current routes.
* Authentication boundaries.
* Supabase usage.
* Mapbox usage.
* Quest data flow.
* Existing loading and error states.
* Accessibility.
* SEO and metadata.
* Image handling.
* Performance risks.
* Existing analytics hooks.
* Mobile behavior.
* Reusable components.
* Dead or duplicated UI.
* Tests and validation scripts.
* Documentation that constrains implementation.

Also inspect the live website at mobile and desktop widths.

Create a brief design audit that identifies:

1. What is working.
2. What is visually inconsistent.
3. What is unclear to first-time users.
4. What reduces trust.
5. What hurts mobile usability.
6. What weakens conversion.
7. What should be preserved.
8. What should be redesigned.
9. What must not be changed because it is connected to working application logic.

Required design deliverables

Develop a unified design system covering:

* Color tokens.
* Typography.
* Spacing.
* Grid.
* Border radii.
* Elevation.
* Icons.
* Buttons.
* Inputs.
* Navigation.
* Cards.
* Map overlays.
* Tags and statuses.
* Progress indicators.
* XP and Points presentation.
* Rewards.
* Modals and drawers.
* Loading states.
* Empty states.
* Error states.
* Success states.
* Mobile tab navigation.
* Desktop navigation.
* Image treatments.
* Motion principles.

Use named semantic tokens rather than scattering hard-coded styling values.

Preserve dark-mode support when it exists. Ensure both themes feel intentionally designed rather than mechanically inverted.

Pages and surfaces to redesign

Audit the repository to determine the exact route names and current implementation. At minimum, address the following applicable surfaces.

Public homepage

The homepage should include:

1. A clear hero statement.
2. A brief explanation of SideQuests.
3. A strong “Explore quests” action.
4. A secondary partner action.
5. A product demonstration using real or representative quest content.
6. A visual explanation of the core quest loop.
7. Featured Miami quests or neighborhoods.
8. XP, Points, rewards, and progress explained simply.
9. A section showing why the product benefits local businesses.
10. An invitation to become a partner.
11. A concise FAQ.
12. A proper footer with existing legal links and the correct support contact.

Do not make the homepage feel like a long investor deck.

Quest discovery

Improve:

* Quest card hierarchy.
* Search.
* Categories.
* Difficulty.
* Neighborhood.
* Distance.
* Reward visibility.
* Map/list relationship.
* Selected quest behavior.
* Empty and loading states.
* Mobile filtering.
* Location permission states.
* Clear distinction between available, completed, locked, and expired quests.

Quest detail

The user should immediately see:

* Quest title.
* Venue.
* Hero image.
* Objective.
* Difficulty.
* Estimated time.
* XP.
* Points.
* Reward.
* Location.
* Distance.
* Business links.
* Completion eligibility.
* Primary action.

The page must prioritize the actual action the user needs to take at the venue.

Scan experience

Create a clear and trustworthy scan interface with:

* Camera permission state.
* QR targeting guidance.
* Success feedback.
* Invalid code state.
* Wrong-location state where applicable.
* Already-completed state.
* Quest-unavailable state.
* Recovery actions.

Do not simulate functionality that the repository does not currently support.

Completion and capture flow

Design:

* Quest completion confirmation.
* Capture the Moment.
* Photo or video flow where currently supported.
* XP and Points earned.
* Reward unlocked.
* Share-for-bonus prompt where currently supported.
* Community Note prompt.
* Next recommended quest.

The completion moment should feel celebratory without becoming visually noisy or childish.

Profile and progression

Improve:

* User identity.
* XP and level.
* Points balance.
* Achievements.
* Adventure Log.
* Completed quests.
* Saved or planned quests, if supported.
* Rewards.
* Settings and account controls.

Use “Adventure Log” and “Community Notes” consistently.

Partner journey

Create or improve a partner-facing page that explains:

* What partner quests are.
* How verified visits work.
* Potential measurable actions.
* Available business links.
* Reward mechanics.
* What setup requires.
* Who the platform is for.
* How to express interest.

Do not invent pricing, partner counts, conversion rates, testimonials, integrations, or business outcomes.

Authentication

Ensure sign-up and sign-in feel connected to the main product.

The sign-up flow must preserve:

* Existing authentication behavior.
* Privacy Policy acceptance.
* Terms of Service acceptance.
* Existing consent requirements.
* Existing validation.
* Existing account deletion pathways.

Copy direction

Rewrite interface copy where needed.

Copy should be:

* Short.
* Active.
* Human.
* Adventurous.
* Specific.
* Local.
* Clear about the next action.

Preferred language includes:

* Find your next SideQuest.
* Explore nearby.
* Start this quest.
* Scan at the venue.
* Capture the moment.
* Earn XP.
* Earn Points.
* Unlock your reward.
* Add to your Adventure Log.
* Leave a Community Note.

Avoid forcing game terminology into every sentence.

Do not write unsupported promises such as:

* Guaranteed customer growth.
* Exclusive access everywhere.
* Earn real money.
* The number-one Miami app.
* Hundreds of partners.
* Thousands of explorers.

Engineering constraints

The redesign must work with the existing application.

Do not:

* Replace the framework without a demonstrated necessity.
* Rewrite working business logic for aesthetic reasons.
* Change Supabase schemas.
* Modify production data.
* change authentication behavior.
* Replace Mapbox.
* Change environment variables.
* Expose secrets.
* Insert placeholder API keys.
* Introduce a major dependency without justification.
* Create duplicate systems alongside existing ones.
* Replace real content with hard-coded demo content.
* remove legal or consent functionality.
* Break existing deep links.
* Commit generated binary assets unnecessarily.
* Make unrelated repository changes.

Prefer:

* Existing dependencies.
* Existing components where sound.
* Focused refactors.
* Semantic design tokens.
* Composable components.
* Progressive enhancement.
* Accessible native HTML.
* CSS-based motion.
* Optimized image loading.
* Minimal client-side JavaScript where possible.
* Small, reviewable commits.

If a design recommendation requires unsupported backend functionality, present it as a clearly labeled future recommendation rather than implementing a fake interaction.

Accessibility requirements

Target WCAG 2.2 AA.

Verify:

* Color contrast.
* Keyboard navigation.
* Visible focus states.
* Semantic headings.
* Form labels.
* Error announcements.
* Screen-reader names.
* Touch-target sizing.
* Reduced-motion support.
* Alt text.
* Map alternatives.
* Non-color status indicators.
* Modal focus management.
* Drawer accessibility.

Performance requirements

Protect mobile performance.

Audit and improve where appropriate:

* Largest Contentful Paint.
* Cumulative Layout Shift.
* Image dimensions and formats.
* Lazy loading.
* Font loading.
* Route-level code splitting.
* Client bundle size.
* Map initialization.
* Repeated data requests.
* Animation cost.

Do not sacrifice usability for cinematic effects.

SEO and sharing

Improve public-page SEO without exposing authenticated content.

Review:

* Page titles.
* Meta descriptions.
* Canonical URLs.
* Open Graph data.
* Social preview images.
* Structured data where legitimately applicable.
* Heading structure.
* Crawlable public content.
* Sitemap and robots behavior where already supported.

Do not create structured data containing fabricated ratings, events, prices, or reviews.

Visual asset handling

Use supplied brand and photography assets first.

When an asset is missing:

1. Identify the missing asset.
2. Specify its required dimensions, format, crop, and intended use.
3. Use a clearly labeled temporary placeholder only when necessary.
4. Do not treat generated placeholder artwork as approved brand material.

Do not use random remote image URLs that may disappear.

Implementation process

Work in the following phases.

Phase 1: Repository and experience audit

Inspect the codebase and live experience.

Return:

* Current architecture summary.
* Design audit.
* User-journey problems.
* Technical risks.
* Proposed route and component scope.
* Files expected to change.
* Items that require design assets.
* Items that are intentionally out of scope.

Phase 2: Design direction

Create three meaningfully different visual directions.

Each direction should include:

* Name.
* Strategic idea.
* Mood.
* Color approach.
* Typography approach.
* Image treatment.
* Navigation style.
* Quest card concept.
* Map treatment.
* XP and Points treatment.
* Benefits.
* Risks.

The directions must differ structurally and conceptually—not merely by changing accent colors.

Recommend one direction and explain why it best supports the Miami MVP, consumer adoption, and future partner sales.

Phase 3: Page system

Create high-fidelity responsive concepts for:

* Homepage.
* Quest discovery.
* Quest detail.
* Scan.
* Quest completion.
* Profile or Adventure Log.
* Partner page.
* Authentication.

Show key mobile and desktop states.

Phase 4: Implementation

After selecting the recommended direction, implement it using the existing repository architecture.

Implement the design as a coherent system rather than isolated page makeovers.

Phase 5: Verification

Run all available:

* Type checks.
* Linting.
* Unit tests.
* Integration tests.
* Production build.
* Route smoke tests.
* Browser verification.
* Mobile viewport checks.
* Accessibility checks.

Visually inspect at least:

* 375 × 812.
* 390 × 844.
* 768 × 1024.
* 1440 × 900.

Verify:

* No horizontal overflow.
* No clipped content.
* No unreadable overlays.
* Navigation remains usable.
* Map controls do not conflict with mobile controls.
* Loading and empty states render correctly.
* Forms remain functional.
* Authentication still works.
* Legal links work.
* Core quest data still loads.
* Existing links and integrations remain intact.

Required final report

At completion, provide:

1. Executive summary.
2. Selected design direction.
3. Before-and-after experience improvements.
4. Routes redesigned.
5. Components created or modified.
6. Design tokens introduced.
7. Copy changes.
8. Accessibility improvements.
9. Performance improvements.
10. Tests run and results.
11. Screenshots or previews for major routes.
12. Remaining asset needs.
13. Known limitations.
14. Recommended next steps.
15. Exact files changed.
16. A statement confirming whether Supabase schemas, production data, authentication logic, environment variables, Mapbox configuration, or legal consent behavior were changed.

Git workflow

Create a dedicated branch for this work.

Use focused commits that separate:

* Design-system changes.
* Shared components.
* Public website changes.
* Product-surface changes.
* Accessibility and performance fixes.
* Tests and documentation.

Do not merge directly into the default branch.

Create a reviewable pull request with:

* Clear summary.
* Screenshots.
* Testing evidence.
* Migration notes, if any.
* Risks.
* Rollback considerations.

Do not claim completion until the production build succeeds and the key routes have been visually verified.

Begin with the audit and design directions. Do not immediately commit a broad redesign before demonstrating that you understand the existing product and repository.