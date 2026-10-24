/**
 * GPS geofence rules for `gps` quests.
 *
 * The server is the authority: complete_quest() (supabase/migrations/
 * 0024_gps_geofence.sql) applies these same rules, and public.distance_m()
 * is the SQL twin of distanceM(). Keep the constants in step with that file.
 * The client uses this module for LocalRepository parity and for messages.
 *
 * The position is compared and discarded — never stored.
 */

export const DEFAULT_GEOFENCE_RADIUS_M = 150;
/** Fixes reported as less accurate than this are refused. */
export const MAX_ACCURACY_M = 100;
/** GPS error forgiven beyond the radius: least(accuracy, this). */
export const ACCURACY_ALLOWANCE_M = 50;

export interface GeoPosition {
  latitude: number;
  longitude: number;
  /** Reported accuracy radius in metres (GeolocationCoordinates.accuracy). */
  accuracy: number;
}

export type GeofenceResult =
  | { ok: true; distanceM: number; radiusM: number }
  | { ok: false; error: "location_required" | "location_inaccurate" }
  | { ok: false; error: "outside_geofence"; distanceM: number; radiusM: number };

/** Great-circle (haversine) distance in metres, mean Earth radius 6371 km. */
export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

export function checkGeofence(
  position: GeoPosition | null | undefined,
  venue: { latitude: number; longitude: number },
  radiusM: number | null | undefined,
): GeofenceResult {
  if (
    !position ||
    !Number.isFinite(position.latitude) ||
    !Number.isFinite(position.longitude) ||
    Math.abs(position.latitude) > 90 ||
    Math.abs(position.longitude) > 180
  ) {
    return { ok: false, error: "location_required" };
  }
  if (!Number.isFinite(position.accuracy) || position.accuracy < 0 || position.accuracy > MAX_ACCURACY_M) {
    return { ok: false, error: "location_inaccurate" };
  }
  const radius = radiusM ?? DEFAULT_GEOFENCE_RADIUS_M;
  const distance = distanceM(position.latitude, position.longitude, venue.latitude, venue.longitude);
  if (distance > radius + Math.min(position.accuracy, ACCURACY_ALLOWANCE_M)) {
    return { ok: false, error: "outside_geofence", distanceM: Math.round(distance), radiusM: radius };
  }
  return { ok: true, distanceM: Math.round(distance), radiusM: radius };
}

/**
 * Ask the browser for one fresh, high-accuracy fix. Called only when the
 * player taps Complete on a gps quest — never on page load. Resolves null when
 * location is unsupported, denied, or times out.
 */
export function requestPosition(timeoutMs = 15000): Promise<GeoPosition | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 },
    );
  });
}
