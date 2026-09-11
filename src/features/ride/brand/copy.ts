/**
 * THE FEED — approved brand copy. Locked by docs/brand/THE_FEED_BRAND_IDENTITY.md.
 * Screens must consume these strings instead of hardcoding brand language.
 */
export const product = {
  name: 'THE FEED',
  essence: 'The pulse of what is happening right now.',
  tagline: 'Fast, fresh, and made for right now.',
  supportingLine: 'News. Music. Entertainment. JOYRIDE.',
  positioning: 'The passenger media network for cities in motion.',
  city: 'Miami, FL',
  cityShort: 'Miami',
} as const

export type ModuleKey = 'news' | 'music' | 'entertainment' | 'joyride'

export const modules: Record<
  ModuleKey,
  { key: ModuleKey; name: string; description: string; route: string }
> = {
  news: {
    key: 'news',
    name: 'NEWS',
    description: 'What matters now.',
    route: '/ride/news',
  },
  music: {
    key: 'music',
    name: 'MUSIC',
    description: 'Artists, playlists, and what Miami is listening to.',
    route: '/ride/music',
  },
  entertainment: {
    key: 'entertainment',
    name: 'ENTERTAINMENT',
    description: 'Culture, events, and what to do next.',
    route: '/ride/entertainment',
  },
  joyride: {
    key: 'joyride',
    name: 'JOYRIDE',
    description: 'Games, challenges, and SideQuests for the ride.',
    route: '/ride/joyride',
  },
}

export const joyride = {
  lockup: { name: 'JOYRIDE', by: 'by THE FEED' },
  line: 'Play the ride.',
  subtitle: 'Games for the ride. Fun for everyone.',
} as const

export const idleScreen = {
  primaryAction: 'Tap anywhere to begin',
  secondaryAction: 'Sleep screen',
} as const

export const homePrompt = 'What are you in the mood for?'

export const cta = {
  readNow: 'Read now',
  playNow: 'Play now',
  startJoyride: 'Start JOYRIDE',
  startSideQuest: 'Start this SideQuest',
  sendToPhone: 'Send to my phone',
  saveForLater: 'Save for later',
  seeNearby: 'See what is nearby',
  viewDetails: 'View details',
  tonightsLineup: "See tonight's lineup",
  joinCommunity: 'Join the community',
  claimOffer: 'Claim offer',
} as const

/** The only approved sponsorship labels. Every sponsored surface must use one. */
export const sponsorshipLabels = {
  sponsored: 'Sponsored',
  featuredPartner: 'Featured partner',
  promotedExperience: 'Promoted experience',
  sponsoredSideQuest: 'Sponsored SideQuest',
  communitySponsor: 'Community sponsor',
  demoPlacement: 'Demo sponsored placement',
} as const

/** Approved community section labels. */
export const communityLabels = {
  aroundMiami: 'Around Miami',
  community: 'Community',
  happeningNearby: 'Happening Nearby',
} as const

/**
 * Prohibited AI-style phrases (brand identity §10). A unit test sweeps all rider-facing
 * copy and mock content for these.
 */
export const prohibitedPhrases = [
  'unlock unforgettable experiences',
  'curated just for you',
  'immerse yourself',
  'elevate your journey',
  'seamlessly discover',
  'vibrant tapestry',
  'hidden gems at every turn',
  'redefine entertainment',
  'embark on an adventure',
  'your ultimate destination',
  'something for everyone',
] as const

/** Honest framing for prototype content — shown in dev/demo contexts, never as "live". */
export const demoDisclosure = {
  contentNote: 'Sample content for demonstration. Not live news or verified listings.',
  sponsorNote: 'Fictional business shown for demonstration.',
  /** Compact inline disclosure for surfaces that carry a LIVE treatment. */
  sampleData: 'Sample data',
} as const
