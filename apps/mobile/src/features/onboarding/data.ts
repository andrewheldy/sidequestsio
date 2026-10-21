import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

/**
 * Onboarding choices. Ids, labels and the explorer-style energy mapping are
 * identical to the website (src/lib/onboarding.ts) because they are stored in
 * profiles.interests / quest_style / quest_energy / starting_area.
 */
type IconName = ComponentProps<typeof Ionicons>['name'];

export interface VibeOption {
  id: string;
  icon: IconName;
  label: string;
}

export interface ExplorerStyle {
  id: string;
  icon: IconName;
  label: string;
  description: string;
  /** Maps the playful archetype to the quest-energy bucket stored on the profile. */
  energy: string;
}

export interface Neighborhood {
  id: string;
  icon: IconName;
  label: string;
}

export const VIBES: VibeOption[] = [
  { id: 'foodie', icon: 'restaurant-outline', label: 'Foodie' },
  { id: 'nightlife', icon: 'moon-outline', label: 'Nightlife' },
  { id: 'wellness', icon: 'sparkles-outline', label: 'Wellness' },
  { id: 'culture', icon: 'color-palette-outline', label: 'Culture' },
  { id: 'outdoor', icon: 'leaf-outline', label: 'Outdoor' },
  { id: 'community', icon: 'people-outline', label: 'Community' },
  { id: 'hidden-gems', icon: 'diamond-outline', label: 'Hidden Gems' },
];

export const EXPLORER_STYLES: ExplorerStyle[] = [
  { id: 'relaxed', icon: 'sunny-outline', label: 'Relaxed Explorer', description: 'Slow mornings, scenic strolls, no pressure.', energy: 'chill' },
  { id: 'social', icon: 'people-outline', label: 'Social Adventurer', description: 'Bring friends, meet locals, share the moment.', energy: 'social' },
  { id: 'competitive', icon: 'trophy-outline', label: 'Competitive Hunter', description: 'Collect progress and finish more quests.', energy: 'competitive' },
  { id: 'chaos', icon: 'dice-outline', label: 'Chaos Goblin', description: 'Unpredictable detours and gloriously bad ideas.', energy: 'chaotic-good' },
];

export const NEIGHBORHOODS: Neighborhood[] = [
  { id: 'south-beach', icon: 'water-outline', label: 'South Beach' },
  { id: 'wynwood', icon: 'color-palette-outline', label: 'Wynwood' },
  { id: 'brickell', icon: 'business-outline', label: 'Brickell' },
  { id: 'downtown', icon: 'library-outline', label: 'Downtown' },
  { id: 'little-havana', icon: 'musical-notes-outline', label: 'Little Havana' },
  { id: 'design-district', icon: 'bag-handle-outline', label: 'Design District' },
  { id: 'coconut-grove', icon: 'leaf-outline', label: 'Coconut Grove' },
  { id: 'fort-lauderdale', icon: 'boat-outline', label: 'Fort Lauderdale' },
];

export interface OnboardingSelections {
  vibes: string[];
  explorerStyle: string | null;
  neighborhood: string | null;
}

export const emptySelections: OnboardingSelections = { vibes: [], explorerStyle: null, neighborhood: null };

export const TOTAL_STEPS = 6;
