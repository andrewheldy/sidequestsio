import type { LocationSample, SampleQuality } from './types';

// Tunable heuristics from docs/product/LOCATION_DISCOVERY.md §3, not guarantees.
export const LAST_KNOWN_MAX_AGE_MS = 2 * 60_000;
export const DISCOVERY_MAX_ACCURACY_M = 200;
export const LOCATION_WAIT_MS = 8_000;
export const REQUERY_DISTANCE_M = 200;
export const MIN_REQUERY_INTERVAL_MS = 30_000;

export function isValidCoordinate(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

export function assessSample(sample: LocationSample | null, now: number): SampleQuality {
  if (!sample || !isValidCoordinate(sample.latitude, sample.longitude)) return 'unusable';
  if (sample.accuracyM == null || !Number.isFinite(sample.accuracyM) || sample.accuracyM > DISCOVERY_MAX_ACCURACY_M) {
    return 'coarse';
  }
  if (now - sample.capturedAt > LAST_KNOWN_MAX_AGE_MS) return 'stale';
  return 'precise';
}

/** Great-circle distance in meters. */
export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_008.8 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Whether a new device sample should trigger a new discovery query: after
 * meaningful movement, but never more often than the throttle allows.
 */
export function shouldRequery(
  previous: { sample: LocationSample; queriedAt: number } | null,
  next: LocationSample,
  now: number,
) {
  if (!previous) return true;
  if (now - previous.queriedAt < MIN_REQUERY_INTERVAL_MS) return false;
  return distanceMeters(previous.sample, next) >= REQUERY_DISTANCE_M;
}
