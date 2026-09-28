/**
 * Content for the /iiipoints concept microsite.
 *
 * Everything here is illustrative. The page is an unofficial SideQuests pitch
 * concept: the quests, sponsor activations, map, rewards and numbers are
 * mock-ups, not live campaigns, real festival grounds or real statistics.
 * Keep that framing when editing copy (see the disclaimer in FinalSection).
 */

export type QuestKind = 'DISCOVERY' | 'MUSIC' | 'EXPLORATION' | 'SECRET' | 'TASTE' | 'MIAMI';

export interface FestivalQuest {
  id: string;
  title: string;
  copy: string;
  xp: number;
  kind: QuestKind;
  /** 1–3 pips. */
  difficulty: 1 | 2 | 3;
  time: string;
  location: string;
  reward: string;
  sponsor?: string;
  /** Labels for each check-in. Completing the last one completes the quest. */
  steps: string[];
  /** Badge id earned on completion, if any. */
  badge?: BadgeId;
  hint?: string;
}

export const KIND_LABEL: Record<QuestKind, string> = {
  DISCOVERY: 'DISCOVERY QUEST',
  MUSIC: 'MUSIC QUEST',
  EXPLORATION: 'EXPLORATION QUEST',
  SECRET: 'SECRET QUEST',
  TASTE: 'TASTE QUEST',
  MIAMI: 'MIAMI QUEST',
};

export const FESTIVAL_QUESTS: FestivalQuest[] = [
  {
    id: 'find-your-next-sound',
    title: 'FIND YOUR NEXT SOUND',
    copy: "Visit a stage you've never been to before.",
    xp: 150,
    kind: 'DISCOVERY',
    difficulty: 1,
    time: '15 MIN',
    location: 'ANY NEW STAGE',
    reward: 'STAGE HOPPER progress',
    steps: ['SCAN AT A NEW STAGE'],
  },
  {
    id: 'change-your-frequency',
    title: 'CHANGE YOUR FREQUENCY',
    copy: "Catch an artist from a genre you don't normally listen to.",
    xp: 200,
    kind: 'MUSIC',
    difficulty: 2,
    time: '45 MIN',
    location: 'LINEUP-WIDE',
    reward: 'NIGHT CREATURE progress',
    hint: 'e.g. off your usual path: FLYING LOTUS · TOKISCHA · FOUR TET',
    steps: ['PICK AN UNFAMILIAR SET', 'CHECK IN AT THE SET'],
  },
  {
    id: 'three-stages',
    title: '3 STAGES. 3 WORLDS.',
    copy: 'Check in at three different stages before midnight.',
    xp: 250,
    kind: 'EXPLORATION',
    difficulty: 2,
    time: 'BEFORE 12AM',
    location: '3 STAGES',
    reward: 'STAGE HOPPER badge',
    badge: 'stage-hopper',
    steps: ['STAGE 01', 'STAGE 02', 'STAGE 03'],
  },
  {
    id: 'hidden-in-wynwood',
    title: 'HIDDEN IN WYNWOOD',
    copy: 'Find the hidden sidequests door somewhere inside the festival.',
    xp: 300,
    kind: 'SECRET',
    difficulty: 3,
    time: '???',
    location: '??? ??? ???',
    reward: 'SECRET FINDER badge',
    badge: 'secret-finder',
    hint: 'Psst — there is a door hidden on the concept map below, too.',
    steps: ['FIND THE DOOR', 'SCAN THE DOOR'],
  },
  {
    id: 'taste-the-festival',
    title: 'TASTE THE FESTIVAL',
    copy: 'Visit a participating food or beverage partner.',
    xp: 100,
    kind: 'TASTE',
    difficulty: 1,
    time: '10 MIN',
    location: 'FOOD + DRINK',
    reward: 'TASTE MAKER badge + partner perk',
    sponsor: 'PARTICIPATING F&B PARTNER',
    badge: 'taste-maker',
    steps: ['SCAN AT PARTNER COUNTER'],
  },
];

export const MIAMI_QUESTS: FestivalQuest[] = [
  {
    id: 'wynwood-aftermath',
    title: 'WYNWOOD AFTERMATH',
    copy: 'Explore food, art, and hidden spots after the festival.',
    xp: 300,
    kind: 'MIAMI',
    difficulty: 2,
    time: '2 HRS',
    location: 'WYNWOOD',
    reward: 'MIAMI EXPLORER badge',
    badge: 'miami-explorer',
    steps: ['MURAL', 'BITE', 'HIDDEN SPOT'],
  },
  {
    id: 'sunday-reset',
    title: 'SUNDAY RESET',
    copy: 'Coffee. Food. Sun. Recovery.',
    xp: 200,
    kind: 'MIAMI',
    difficulty: 1,
    time: 'SUNDAY',
    location: 'LITTLE RIVER',
    reward: 'Partner brunch perk (concept)',
    steps: ['COFFEE', 'SUN'],
  },
  {
    id: 'back-to-reality',
    title: 'BACK TO REALITY',
    copy: 'Unlock a Monday Miami reward.',
    xp: 150,
    kind: 'MIAMI',
    difficulty: 1,
    time: 'MONDAY',
    location: 'DESIGN DISTRICT',
    reward: 'Monday Miami reward (concept)',
    steps: ['SCAN TO UNLOCK'],
  },
];

/* ─── Sponsor quests ───────────────────────────────────────────────────── */

export type SponsorVariant = 'redbull' | 'stella' | 'playboy';

export interface SponsorQuest {
  id: string;
  variant: SponsorVariant;
  sponsor: string;
  title: string;
  copy: string[];
  objectives: string[];
  xp: number;
  badge: BadgeId;
  conceptReward: string;
  tags: string[];
  cta: string;
  completeTitle: string;
  /** Short meta line shown in the card header. */
  meta: string;
}

export const SPONSOR_QUESTS: SponsorQuest[] = [
  {
    id: 'wings-after-dark',
    variant: 'redbull',
    sponsor: 'RED BULL',
    title: 'WINGS AFTER DARK',
    copy: [
      'The night is just getting started.',
      'Hit three high-energy moments across the festival and finish your route at the Red Bull activation.',
    ],
    objectives: [
      'Check in at one high-energy electronic set.',
      "Explore a second stage you've never visited.",
      'Find the Red Bull activation.',
    ],
    xp: 400,
    badge: 'energy-boost',
    conceptReward: 'Unlock a surprise Red Bull perk or branded moment.',
    tags: ['SPONSOR QUEST', 'HIGH ENERGY', 'LIMITED TIME'],
    cta: 'START QUEST',
    completeTitle: 'ENERGY UNLOCKED.',
    meta: 'ENDS 2:00 AM',
  },
  {
    id: 'the-perfect-pour',
    variant: 'stella',
    sponsor: 'STELLA ARTOIS',
    title: 'THE PERFECT POUR',
    copy: ['Not every festival moment needs to happen at 150 BPM.', 'Find your reset.'],
    objectives: [
      'Discover the Stella Artois experience.',
      'Check in during a featured time window.',
      'Take a moment to reset before your next adventure.',
    ],
    xp: 250,
    badge: 'night-in-balance',
    conceptReward: 'Unlock access to a curated lounge moment, premium experience, or partner perk.',
    tags: ['SOCIAL QUEST', 'CURATED EXPERIENCE', 'REFRESH'],
    cta: 'CLAIM QUEST',
    completeTitle: 'MOMENT FOUND.',
    meta: 'FEATURED WINDOW 7:00–8:30 PM',
  },
  {
    id: 'after-hours-access',
    variant: 'playboy',
    sponsor: 'PLAYBOY',
    title: 'AFTER HOURS ACCESS',
    copy: [
      'Discover the playful side of III Points after dark.',
      'Follow the clue. Find the hidden Playboy activation. Unlock what’s waiting inside.',
    ],
    objectives: [
      'Unlock the quest after the specified evening time.',
      'Solve a festival clue.',
      'Locate the hidden activation or branded photo moment.',
    ],
    xp: 350,
    badge: 'after-hours',
    conceptReward: 'Unlock a hidden experience, exclusive content moment, surprise quest, or branded access.',
    tags: ['SECRET QUEST', 'AFTER DARK', 'HIDDEN EXPERIENCE'],
    cta: 'UNLOCK QUEST',
    completeTitle: 'ACCESS GRANTED.',
    meta: 'UNLOCKS AFTER DARK',
  },
];

export const PLAYBOY_CLUE = {
  riddle: 'Four hours. Three fours. Where the set never seems to end, the next door opens.',
  options: ['MAIN STAGE', '444', 'MERCH'],
  answer: '444',
};

/* ─── Badges ───────────────────────────────────────────────────────────── */

export type BadgeId =
  | 'energy-boost'
  | 'night-in-balance'
  | 'after-hours'
  | 'stage-hopper'
  | 'night-creature'
  | 'secret-finder'
  | 'miami-explorer'
  | 'taste-maker';

export interface Badge {
  id: BadgeId;
  name: string;
  glyph: string;
  color: 'lime' | 'yellow' | 'coral' | 'cyan' | 'orange' | 'lav';
  how: string;
}

export const BADGES: Badge[] = [
  { id: 'energy-boost', name: 'ENERGY BOOST', glyph: 'ϟ', color: 'coral', how: 'Complete WINGS AFTER DARK.' },
  { id: 'night-in-balance', name: 'NIGHT IN BALANCE', glyph: '◐', color: 'yellow', how: 'Complete THE PERFECT POUR.' },
  { id: 'after-hours', name: 'AFTER HOURS', glyph: '☾', color: 'lav', how: 'Complete AFTER HOURS ACCESS.' },
  { id: 'stage-hopper', name: 'STAGE HOPPER', glyph: '⌁', color: 'cyan', how: 'Complete 3 STAGES. 3 WORLDS.' },
  { id: 'night-creature', name: 'NIGHT CREATURE', glyph: '✶', color: 'orange', how: 'Earned: still exploring at 3AM.' },
  { id: 'secret-finder', name: 'SECRET FINDER', glyph: '⌂', color: 'lime', how: 'Find a hidden door or a secret quest.' },
  { id: 'miami-explorer', name: 'MIAMI EXPLORER', glyph: '✦', color: 'cyan', how: 'Complete a post-festival Miami quest.' },
  { id: 'taste-maker', name: 'TASTE MAKER', glyph: '◉', color: 'orange', how: 'Complete TASTE THE FESTIVAL.' },
];

/** Badges the sample profile already holds when the page loads. */
export const STARTING_BADGES: BadgeId[] = ['night-creature'];

export const REWARD_CATEGORIES = [
  { name: 'ACCESS', line: 'Early entry lanes, viewing decks, set-time perks.' },
  { name: 'MERCH', line: 'Quest-only drops and limited pieces.' },
  { name: 'FOOD + DRINK', line: 'Partner bites, pours and upgrades.' },
  { name: 'PARTNER PERKS', line: 'Brand moments unlocked by playing.' },
  { name: 'SECRET EXPERIENCES', line: 'Rooms and moments you have to find.' },
  { name: 'MIAMI REWARDS', line: 'Perks at sidequests partners citywide.' },
];

/* ─── XP / levels ──────────────────────────────────────────────────────── */

/** The sample profile's XP before anything on the page is played. */
export const BASE_XP = 2450;

/** XP needed to reach each level (index 0 = level 1). */
export const LEVEL_THRESHOLDS = [0, 150, 400, 750, 1100, 1500, 1900, 3000, 4000, 5000, 6200, 7500];

export function levelFor(xp: number) {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  const floor = LEVEL_THRESHOLDS[level - 1];
  const next = LEVEL_THRESHOLDS[level] ?? floor + 1500;
  return { level, floor, next, progress: (xp - floor) / (next - floor), toNext: next - xp };
}

/* ─── Concept map ──────────────────────────────────────────────────────── */

export type MapNodeKind = 'stage' | 'sponsor' | 'service' | 'secret' | 'portal' | 'you';

export interface MapNode {
  id: string;
  label: string;
  kind: MapNodeKind;
  /** Landscape layout, viewBox 1000×640. */
  x: number;
  y: number;
  /** Portrait layout, viewBox 600×960. */
  mx: number;
  my: number;
  blurb: string;
  quest?: string;
  questAnchor?: string;
  xp?: number;
}

export const MAP_NODES: MapNode[] = [
  { id: 'you', label: 'YOU ARE HERE', kind: 'you', x: 90, y: 560, mx: 100, my: 900, blurb: 'Main entrance. Every route starts somewhere.' },
  { id: 'main', label: 'MAIN STAGE', kind: 'stage', x: 260, y: 120, mx: 150, my: 110, blurb: 'Headliner energy. Catch something outside your usual genre.', quest: 'CHANGE YOUR FREQUENCY', questAnchor: 'quest-change-your-frequency', xp: 200 },
  { id: '444', label: '444', kind: 'stage', x: 760, y: 120, mx: 450, my: 110, blurb: 'Four-hour extended sets. A stage you can get lost in.', quest: 'FIND YOUR NEXT SOUND', questAnchor: 'quest-find-your-next-sound', xp: 150 },
  { id: 'rest', label: 'REST', kind: 'service', x: 480, y: 90, mx: 300, my: 230, blurb: 'Water, shade, charging. Recovery counts as strategy.' },
  { id: 'merch', label: 'MERCH', kind: 'service', x: 90, y: 280, mx: 90, my: 330, blurb: 'Quest-only drops could live here.' },
  { id: 'art', label: 'ART', kind: 'stage', x: 430, y: 280, mx: 330, my: 370, blurb: 'Installations worth a detour. Some of them are doors.', quest: '3 STAGES. 3 WORLDS.', questAnchor: 'quest-three-stages', xp: 250 },
  { id: 'stella', label: 'STELLA ARTOIS', kind: 'sponsor', x: 880, y: 300, mx: 510, my: 330, blurb: 'Concept activation: a slower, curated reset.', quest: 'THE PERFECT POUR', questAnchor: 'sponsor-the-perfect-pour', xp: 250 },
  { id: 'food', label: 'FOOD', kind: 'service', x: 250, y: 440, mx: 130, my: 520, blurb: 'Food + beverage partners. Scan at the counter.', quest: 'TASTE THE FESTIVAL', questAnchor: 'quest-taste-the-festival', xp: 100 },
  { id: 'portal', label: 'SIDEQUEST PORTAL', kind: 'portal', x: 560, y: 430, mx: 330, my: 560, blurb: 'Where festival XP turns into Miami quests.', quest: 'THE QUEST CONTINUES', questAnchor: 'miami' },
  { id: 'redbull', label: 'RED BULL', kind: 'sponsor', x: 740, y: 470, mx: 500, my: 640, blurb: 'Concept activation: the final stop on a high-energy route.', quest: 'WINGS AFTER DARK', questAnchor: 'sponsor-wings-after-dark', xp: 400 },
  { id: 'secret', label: 'SECRET QUEST', kind: 'secret', x: 430, y: 580, mx: 180, my: 770, blurb: 'Something is here. It only shows up when you get close.', quest: 'HIDDEN IN WYNWOOD', questAnchor: 'quest-hidden-in-wynwood', xp: 300 },
  { id: 'playboy', label: 'PLAYBOY', kind: 'sponsor', x: 900, y: 570, mx: 480, my: 810, blurb: 'Concept activation: hidden until after dark.', quest: 'AFTER HOURS ACCESS', questAnchor: 'sponsor-after-hours-access', xp: 350 },
];

export const MAP_EDGES: [string, string][] = [
  ['you', 'merch'],
  ['you', 'food'],
  ['you', 'secret'],
  ['merch', 'main'],
  ['main', 'rest'],
  ['rest', '444'],
  ['main', 'art'],
  ['art', 'food'],
  ['art', 'portal'],
  ['art', 'stella'],
  ['444', 'stella'],
  ['food', 'portal'],
  ['portal', 'redbull'],
  ['redbull', 'stella'],
  ['redbull', 'playboy'],
  ['secret', 'portal'],
  ['secret', 'playboy'],
];

/** The hidden door on the map (HIDDEN IN WYNWOOD). */
export const HIDDEN_DOOR = { x: 640, y: 215, mx: 470, my: 470 };

/* ─── Concept dashboard (fictional) ────────────────────────────────────── */

export const DASHBOARD_KPIS = [
  { value: 12483, label: 'QUESTS COMPLETED' },
  { value: 7241, label: 'UNIQUE EXPLORERS' },
  { value: 3.8, label: 'AVG QUESTS / EXPLORER', decimals: 1 },
  { value: 24, label: 'ACTIVE QUESTS' },
];

/** Fictional check-ins per hour, Friday 4PM → 4AM. */
export const HOURLY_CHECKINS = [
  { hour: '4P', label: '4 PM', value: 212 },
  { hour: '5P', label: '5 PM', value: 348 },
  { hour: '6P', label: '6 PM', value: 521 },
  { hour: '7P', label: '7 PM', value: 734 },
  { hour: '8P', label: '8 PM', value: 902 },
  { hour: '9P', label: '9 PM', value: 1118 },
  { hour: '10P', label: '10 PM', value: 1391 },
  { hour: '11P', label: '11 PM', value: 1482 },
  { hour: '12A', label: '12 AM', value: 1327 },
  { hour: '1A', label: '1 AM', value: 1064 },
  { hour: '2A', label: '2 AM', value: 811 },
  { hour: '3A', label: '3 AM', value: 526 },
  { hour: '4A', label: '4 AM', value: 197 },
];

export const ORGANIZER_SIGNALS = [
  'QUEST PARTICIPATION',
  'ACTIVATION ENGAGEMENT',
  'COMPLETION RATE',
  'REPEAT ENGAGEMENT',
  'LOCATION DISCOVERY',
  'TIME-OF-DAY ACTIVITY',
  'REWARD REDEMPTION',
  'SPONSOR PARTICIPATION',
];
