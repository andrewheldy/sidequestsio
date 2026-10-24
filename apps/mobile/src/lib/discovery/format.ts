import type { QuestCard, QuestCategory } from './types';

export type Units = 'imperial' | 'metric';

const IMPERIAL_REGIONS = new Set(['US', 'LR', 'MM']);

export function deviceUnits(): Units {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const region = locale.split(/[-_]/)[1]?.toUpperCase();
    return region && !IMPERIAL_REGIONS.has(region) ? 'metric' : 'imperial';
  } catch {
    return 'imperial';
  }
}

/**
 * Straight-line distance only: approximate wording, no walking ETA.
 * `device` distances are from the person; `area` distances are from a chosen
 * area or map center and say so; `approximate` is for a coarse or stale fix.
 */
export function formatDistance(distanceM: number | null, units: Units, context: 'device' | 'area' | 'approximate' = 'device') {
  if (distanceM == null) return null;
  if (context === 'approximate') return 'In this area';
  const fromCenter = context === 'area';
  if (distanceM < 400) return fromCenter ? 'Near the center' : 'Nearby';
  const amount =
    units === 'metric'
      ? `${(distanceM / 1000).toFixed(distanceM < 10_000 ? 1 : 0)} km`
      : `${(distanceM / 1609.344).toFixed(distanceM < 16_093 ? 1 : 0)} mi`;
  return fromCenter ? `About ${amount} from center` : `About ${amount} away`;
}

export function formatRadius(km: number, units: Units) {
  if (units === 'metric') return `${km} km`;
  const miles = km * 0.621371;
  return `${miles < 1 ? miles.toFixed(1) : Math.round(miles)} mi`;
}

/** Only structured hours produce "open"; unknown hours never read as open. */
export function formatAvailability(card: Pick<QuestCard, 'availability'>) {
  const { state, closesAt } = card.availability;
  if (state === 'open') {
    if (!closesAt) return 'Open';
    const time = new Date(closesAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `Open · closes ${time}`;
  }
  if (state === 'closed') return 'Closed now';
  return 'Hours not confirmed';
}

export const CATEGORY_LABELS: Record<QuestCategory, string> = {
  art: 'Art',
  food: 'Food & Drink',
  outdoors: 'Outdoors',
  culture: 'Culture',
  nightlife: 'Nightlife',
  shopping: 'Shopping',
  fitness: 'Wellness',
  hidden_gem: 'Hidden gems',
};

/** Explanations derived only from the server's reason codes, never invented. */
export function reasonLabel(code: string): string | null {
  if (code === 'nearby') return 'Close by';
  if (code === 'saved_quest') return 'You saved this';
  if (code === 'event_available') return 'Limited-time quest';
  const interest = /^matches_([a-z_]+)_interest$/.exec(code);
  if (interest) {
    const label = CATEGORY_LABELS[interest[1] as QuestCategory];
    return label ? `Matches your interest in ${label.toLowerCase()}` : null;
  }
  const fits = /^fits_(\d+)_minutes$/.exec(code);
  if (fits) return `Fits in about ${fits[1]} minutes`;
  return null;
}
