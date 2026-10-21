import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';
import type { QuestCategory, QuestLinks, QuestWithContext } from '../../lib/types';
import { questCoords } from './geo';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const categoryLabels: Record<QuestCategory, string> = {
  art: 'Art',
  food: 'Food & Drink',
  outdoors: 'Outdoors',
  culture: 'Culture',
  nightlife: 'Nightlife',
  shopping: 'Shopping',
  fitness: 'Fitness',
  hidden_gem: 'Hidden gem',
};

const categoryIcons: Record<QuestCategory, IconName> = {
  art: 'color-palette-outline',
  food: 'restaurant-outline',
  outdoors: 'leaf-outline',
  culture: 'business-outline',
  nightlife: 'musical-notes-outline',
  shopping: 'bag-outline',
  fitness: 'barbell-outline',
  hidden_gem: 'diamond-outline',
};

export const categoryLabel = (category: string): string =>
  categoryLabels[category as QuestCategory] ?? category.replace(/_/g, ' ');

export const categoryIcon = (category: string): IconName =>
  categoryIcons[category as QuestCategory] ?? 'compass-outline';

/** Quest image, falling back to the venue image. */
export const questImage = (quest: QuestWithContext): string | null => quest.image_url || quest.venue?.image_url || null;

export function neighborhoodOf(quest: QuestWithContext): string | null {
  const value = quest.venue?.neighborhood?.trim();
  return value ? value : null;
}

/** Only active quests inside their date window are presentable. */
export function isQuestAvailable(quest: QuestWithContext, now = Date.now()): boolean {
  if (quest.status !== 'active') return false;
  if (quest.start_date && Date.parse(quest.start_date) > now) return false;
  if (quest.end_date && Date.parse(quest.end_date) < now) return false;
  return true;
}

/** Only https URLs are ever opened from quest data. */
export function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value.trim()).protocol === 'https:';
  } catch {
    return false;
  }
}

export interface QuestLinkItem {
  key: string;
  label: string;
  url: string;
  icon: IconName;
}

const LINK_DEFS: { field: keyof QuestLinks; label: string; icon: IconName }[] = [
  { field: 'website_url', label: 'Website', icon: 'globe-outline' },
  { field: 'instagram_url', label: 'Instagram', icon: 'logo-instagram' },
  { field: 'tiktok_url', label: 'TikTok', icon: 'logo-tiktok' },
  { field: 'x_url', label: 'X', icon: 'logo-twitter' },
  { field: 'reviews_url', label: 'Reviews', icon: 'chatbubble-ellipses-outline' },
  { field: 'google_reviews_url', label: 'Google reviews', icon: 'logo-google' },
  { field: 'menu_url', label: 'Menu', icon: 'restaurant-outline' },
  { field: 'reservation_url', label: 'Reservations', icon: 'calendar-outline' },
];

/** Links actually present (and safe) in `quest.links`. */
export function questLinkItems(links: QuestLinks | null | undefined): QuestLinkItem[] {
  if (!links) return [];
  return LINK_DEFS.flatMap(({ field, label, icon }) => {
    const url = links[field];
    return isHttpsUrl(url) ? [{ key: field, label, url: url.trim(), icon }] : [];
  });
}

/** Maps URL for the venue: coordinates when present, else the address; null if neither. */
export function directionsUrl(quest: QuestWithContext, os: string = Platform.OS): string | null {
  const venue = quest.venue;
  const coords = questCoords(quest);
  const address = [venue?.address, venue?.city].filter(Boolean).join(', ');
  if (!coords && !address) return null;
  const dest = coords ? `${coords.latitude},${coords.longitude}` : address;
  if (os === 'ios') {
    const name = venue?.name ? `&q=${encodeURIComponent(venue.name)}` : '';
    return `https://maps.apple.com/?daddr=${encodeURIComponent(dest)}${name}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}
