import type { QuestWithContext } from '../../lib/types';

export interface Coords {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_MILES = 3958.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in miles. */
export function haversineMiles(a: Coords, b: Coords): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Venue coordinates, or null when the venue is missing or has no usable coordinates. */
export function questCoords(quest: QuestWithContext): Coords | null {
  const lat = quest.venue?.latitude;
  const lon = quest.venue?.longitude;
  if (lat == null || lon == null) return null;
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

/** Distance from the user to the quest's venue; null unless both are known. */
export function distanceToQuest(from: Coords | null, quest: QuestWithContext): number | null {
  const to = questCoords(quest);
  return from && to ? haversineMiles(from, to) : null;
}

export function formatMiles(miles: number): string {
  return miles < 0.1 ? '<0.1 mi' : `${miles.toFixed(1)} mi`;
}
