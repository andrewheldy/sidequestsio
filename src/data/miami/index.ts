/**
 * Miami CRM data loader.
 *
 * Prefers miamiQuestLocations.geocoded.json (produced by `npm run geocode:miami`).
 * Falls back to the raw miamiQuestLocations.json when the geocoded file hasn't
 * been generated yet. Both files are resolved at Vite build time via glob; a
 * missing geocoded file is handled gracefully — the glob result simply won't
 * contain it.
 */

export interface MiamiCRMCoordinates {
  lat: number | null;
  lng: number | null;
}

export interface MiamiCRMGeocoding {
  status: 'matched' | 'no_match' | 'error';
  confidence: 'high' | 'medium' | 'low' | null;
  mapboxPlaceName: string | null;
  mapboxFeatureType: string | null;
  mapboxId: string | null;
}

export interface MiamiCRMRow {
  'Business Name': string;
  Neighborhood: string;
  'Address / Mapbox Coordinates': string;
  'Quest Name': string;
  'Suggested Quest Concept': string;
  'Suggested Reward': string;
  'Thumbnail Image URL': string;
  coordinates?: MiamiCRMCoordinates;
  geocoding?: MiamiCRMGeocoding;
}

// Vite resolves these globs at build time. Files that don't yet exist are
// simply absent from the resulting map — no runtime error.
const modules = import.meta.glob<{ default: MiamiCRMRow[] }>(
  './miamiQuestLocations*.json',
  { eager: false },
);

const GEOCODED_KEY = './miamiQuestLocations.geocoded.json';
const RAW_KEY = './miamiQuestLocations.json';

let cache: MiamiCRMRow[] | null = null;

export async function loadMiamiQuestLocations(): Promise<MiamiCRMRow[]> {
  if (cache) return cache;

  const key = GEOCODED_KEY in modules ? GEOCODED_KEY : RAW_KEY;

  if (!(key in modules)) {
    console.warn('[miami/loader] No Miami CRM data file found.');
    return [];
  }

  const mod = await modules[key]();
  cache = mod.default;
  return cache;
}

/** Synchronous helper — only works after loadMiamiQuestLocations() has resolved. */
export function getMiamiQuestLocationsSync(): MiamiCRMRow[] {
  return cache ?? [];
}
