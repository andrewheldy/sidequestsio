import {
  Building2,
  Dices,
  Gem,
  Landmark,
  Leaf,
  Moon,
  Music,
  Palette,
  Sailboat,
  ShoppingBag,
  Sparkles,
  Trees,
  Trophy,
  Users,
  UtensilsCrossed,
  Waves,
  type LucideIcon,
} from 'lucide-react';

/**
 * Shared onboarding data + helpers.
 *
 * Onboarding works for guests (stored in localStorage) and is persisted to the
 * Supabase `profiles` row once the user creates an account. This keeps the
 * "guest onboarding first, account later" conversion flow working.
 */

export interface VibeOption {
  id: string;
  icon: LucideIcon;
  label: string;
}

export interface ExplorerStyle {
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
  /** Maps the playful archetype to a quest-energy bucket stored on the profile. */
  energy: string;
}

export interface Neighborhood {
  id: string;
  icon: LucideIcon;
  label: string;
}

export const VIBES: VibeOption[] = [
  { id: 'foodie', icon: UtensilsCrossed, label: 'Foodie' },
  { id: 'nightlife', icon: Moon, label: 'Nightlife' },
  { id: 'wellness', icon: Sparkles, label: 'Wellness' },
  { id: 'culture', icon: Palette, label: 'Culture' },
  { id: 'outdoor', icon: Trees, label: 'Outdoor' },
  { id: 'community', icon: Users, label: 'Community' },
  { id: 'hidden-gems', icon: Gem, label: 'Hidden Gems' },
];

export const EXPLORER_STYLES: ExplorerStyle[] = [
  {
    id: 'relaxed',
    icon: Leaf,
    label: 'Relaxed Explorer',
    description: 'Slow mornings, scenic strolls, no pressure.',
    energy: 'chill',
  },
  {
    id: 'social',
    icon: Users,
    label: 'Social Adventurer',
    description: 'Bring friends, meet locals, share the moment.',
    energy: 'social',
  },
  {
    id: 'competitive',
    icon: Trophy,
    label: 'Competitive Hunter',
    description: 'Chase XP, climb leaderboards, win streaks.',
    energy: 'competitive',
  },
  {
    id: 'chaos',
    icon: Dices,
    label: 'Chaos Goblin',
    description: 'Unpredictable detours and gloriously bad ideas.',
    energy: 'chaotic-good',
  },
];

export const NEIGHBORHOODS: Neighborhood[] = [
  { id: 'south-beach', icon: Waves, label: 'South Beach' },
  { id: 'wynwood', icon: Palette, label: 'Wynwood' },
  { id: 'brickell', icon: Building2, label: 'Brickell' },
  { id: 'downtown', icon: Landmark, label: 'Downtown' },
  { id: 'little-havana', icon: Music, label: 'Little Havana' },
  { id: 'design-district', icon: ShoppingBag, label: 'Design District' },
  { id: 'coconut-grove', icon: Trees, label: 'Coconut Grove' },
  { id: 'fort-lauderdale', icon: Sailboat, label: 'Fort Lauderdale' },
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
    },
    nightlife: {
      title: `${neighborhood} After-Dark Soundwalk`,
      reward: 'Skip-the-Line Pass',
      xp: 150,
      distance: '0.9 miles',
      time: '30 minutes',
      category: 'Nightlife',
    },
    wellness: {
      title: `${neighborhood} Sunrise Reset`,
      reward: 'Free Smoothie',
      xp: 100,
      distance: '0.5 miles',
      time: '20 minutes',
      category: 'Wellness',
    },
    culture: {
      title: `${neighborhood} Mural & Gallery Hunt`,
      reward: 'Gallery Print',
      xp: 130,
      distance: '0.8 miles',
      time: '35 minutes',
      category: 'Culture',
    },
    outdoor: {
      title: `${neighborhood} Bayfront Loop`,
      reward: 'Bike Rental Hour',
      xp: 110,
      distance: '1.2 miles',
      time: '30 minutes',
      category: 'Outdoor',
    },
    community: {
      title: `${neighborhood} Local Legends Quest`,
      reward: 'Community Badge',
      xp: 90,
      distance: '0.6 miles',
      time: '25 minutes',
      category: 'Community',
    },
    'hidden-gems': {
      title: `Hidden ${neighborhood} Coffee Crawl`,
      reward: 'Free Specialty Coffee',
      xp: 100,
      distance: '0.6 miles',
      time: '20 minutes',
      category: 'Hidden Gems',
    },
  };

  return byVibe[primaryVibe] ?? byVibe['hidden-gems'];
}
