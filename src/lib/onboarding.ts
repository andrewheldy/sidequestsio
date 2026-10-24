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
import type { QuestWithContext } from '@/types/db';

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
    description: 'Collect progress and finish more quests.',
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

/** Quest categories (db enum) each onboarding vibe points at. */
const CATEGORIES_BY_VIBE: Record<string, string[]> = {
  foodie: ['food'],
  nightlife: ['nightlife'],
  wellness: ['fitness'],
  culture: ['culture', 'art'],
  outdoor: ['outdoors'],
  community: ['culture'],
  'hidden-gems': ['hidden_gem'],
};

export interface FirstQuestPick {
  quest: QuestWithContext;
  /** False when nothing matched the picks and this is just the first active quest. */
  matched: boolean;
}

/**
 * Picks a real, active quest for the "first quest" step: the one that best fits
 * the chosen vibes (category) and neighborhood (venue name/address). Falls back
 * to the first active quest so the step never shows an invented one.
 */
export function pickFirstQuest(
  quests: QuestWithContext[],
  selections: OnboardingSelections,
): FirstQuestPick | null {
  if (quests.length === 0) return null;
  const hood = NEIGHBORHOODS.find((n) => n.id === selections.neighborhood)?.label.toLowerCase();
  const wanted = new Set(selections.vibes.flatMap((v) => CATEGORIES_BY_VIBE[v] ?? []));

  let best = quests[0];
  let bestScore = 0;
  for (const q of quests) {
    const where = `${q.venue?.neighborhood ?? ''} ${q.venue?.name ?? ''} ${q.venue?.address ?? ''}`.toLowerCase();
    const score = (wanted.has(q.category) ? 3 : 0) + (hood && where.includes(hood) ? 2 : 0);
    if (score > bestScore) {
      best = q;
      bestScore = score;
    }
  }
  return { quest: best, matched: bestScore > 0 };
}
