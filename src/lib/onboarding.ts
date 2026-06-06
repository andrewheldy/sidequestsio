/**
 * Shared onboarding data + helpers.
 *
 * Onboarding works for guests (stored in localStorage) and is persisted to the
 * Supabase `profiles` row once the user creates an account. This keeps the
 * "guest onboarding first, account later" conversion flow working.
 */

export interface VibeOption {
  id: string;
  emoji: string;
  label: string;
}

export interface ExplorerStyle {
  id: string;
  emoji: string;
  label: string;
  description: string;
  /** Maps the playful archetype to a quest-energy bucket stored on the profile. */
  energy: string;
}

export interface Neighborhood {
  id: string;
  emoji: string;
  label: string;
}

export const VIBES: VibeOption[] = [
  { id: 'foodie', emoji: '🍔', label: 'Foodie' },
  { id: 'nightlife', emoji: '🎵', label: 'Nightlife' },
  { id: 'wellness', emoji: '🏃', label: 'Wellness' },
  { id: 'culture', emoji: '🎨', label: 'Culture' },
  { id: 'outdoor', emoji: '🌴', label: 'Outdoor' },
  { id: 'community', emoji: '🤝', label: 'Community' },
  { id: 'hidden-gems', emoji: '💎', label: 'Hidden Gems' },
];

export const EXPLORER_STYLES: ExplorerStyle[] = [
  {
    id: 'relaxed',
    emoji: '🌿',
    label: 'Relaxed Explorer',
    description: 'Slow mornings, scenic strolls, no pressure.',
    energy: 'chill',
  },
  {
    id: 'social',
    emoji: '🥂',
    label: 'Social Adventurer',
    description: 'Bring friends, meet locals, share the moment.',
    energy: 'social',
  },
  {
    id: 'competitive',
    emoji: '🏆',
    label: 'Competitive Hunter',
    description: 'Chase XP, climb leaderboards, win streaks.',
    energy: 'competitive',
  },
  {
    id: 'chaos',
    emoji: '😈',
    label: 'Chaos Goblin',
    description: 'Unpredictable detours and gloriously bad ideas.',
    energy: 'chaotic-good',
  },
];

export const NEIGHBORHOODS: Neighborhood[] = [
  { id: 'south-beach', emoji: '🏖️', label: 'South Beach' },
  { id: 'wynwood', emoji: '🎨', label: 'Wynwood' },
  { id: 'brickell', emoji: '🏙️', label: 'Brickell' },
  { id: 'downtown', emoji: '🌆', label: 'Downtown' },
  { id: 'little-havana', emoji: '🇨🇺', label: 'Little Havana' },
  { id: 'design-district', emoji: '🛍️', label: 'Design District' },
  { id: 'coconut-grove', emoji: '🌳', label: 'Coconut Grove' },
  { id: 'fort-lauderdale', emoji: '⛵', label: 'Fort Lauderdale' },
];

export interface OnboardingSelections {
  vibes: string[];
  explorerStyle: string | null;
  neighborhood: string | null;
}

export const emptyOnboarding: OnboardingSelections = {
  vibes: [],
  explorerStyle: null,
  neighborhood: null,
};

const STORAGE_KEY = 'sq_onboarding';

export function loadGuestOnboarding(): OnboardingSelections {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...emptyOnboarding };
    const parsed = JSON.parse(raw);
    return { ...emptyOnboarding, ...parsed };
  } catch {
    return { ...emptyOnboarding };
  }
}

export function saveGuestOnboarding(selections: OnboardingSelections): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
  } catch {
    /* ignore quota / unavailable storage */
  }
}

export function clearGuestOnboarding(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export interface GeneratedQuest {
  title: string;
  reward: string;
  xp: number;
  distance: string;
  time: string;
  category: string;
  emoji: string;
}

/**
 * Builds a playful, deterministic "first quest" preview from the user's
 * selections. Pure mock data — no backend required.
 */
export function buildFirstQuest(selections: OnboardingSelections): GeneratedQuest {
  const neighborhood =
    NEIGHBORHOODS.find((n) => n.id === selections.neighborhood)?.label ?? 'Miami';
  const primaryVibe = selections.vibes[0] ?? 'hidden-gems';

  const byVibe: Record<string, GeneratedQuest> = {
    foodie: {
      title: `${neighborhood} Taco & Cafecito Crawl`,
      reward: 'Free Pastelito',
      xp: 120,
      distance: '0.7 miles',
      time: '25 minutes',
      category: 'Foodie',
      emoji: '🌮',
    },
    nightlife: {
      title: `${neighborhood} After-Dark Soundwalk`,
      reward: 'Skip-the-Line Pass',
      xp: 150,
      distance: '0.9 miles',
      time: '30 minutes',
      category: 'Nightlife',
      emoji: '🎶',
    },
    wellness: {
      title: `${neighborhood} Sunrise Reset`,
      reward: 'Free Smoothie',
      xp: 100,
      distance: '0.5 miles',
      time: '20 minutes',
      category: 'Wellness',
      emoji: '🧘',
    },
    culture: {
      title: `${neighborhood} Mural & Gallery Hunt`,
      reward: 'Gallery Print',
      xp: 130,
      distance: '0.8 miles',
      time: '35 minutes',
      category: 'Culture',
      emoji: '🖼️',
    },
    outdoor: {
      title: `${neighborhood} Bayfront Loop`,
      reward: 'Bike Rental Hour',
      xp: 110,
      distance: '1.2 miles',
      time: '30 minutes',
      category: 'Outdoor',
      emoji: '🌴',
    },
    community: {
      title: `${neighborhood} Local Legends Quest`,
      reward: 'Community Badge',
      xp: 90,
      distance: '0.6 miles',
      time: '25 minutes',
      category: 'Community',
      emoji: '🤝',
    },
    'hidden-gems': {
      title: `Hidden ${neighborhood} Coffee Crawl`,
      reward: 'Free Specialty Coffee',
      xp: 100,
      distance: '0.6 miles',
      time: '20 minutes',
      category: 'Hidden Gems',
      emoji: '💎',
    },
  };

  return byVibe[primaryVibe] ?? byVibe['hidden-gems'];
}
