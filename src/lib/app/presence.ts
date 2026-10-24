/**
 * GPS presence for `gps` quests on the web.
 *
 * The server is the authority (supabase/migrations/0025_gps_presence.sql):
 * create_presence_challenge() → one fresh device sample → verify_gps_presence()
 * returns inside / outside / uncertain → complete_quest(p_presence_check_id).
 * classifyPresence() mirrors verify_gps_presence() so LocalRepository behaves
 * the same; keep the constants in step with that migration.
 *
 * The sample is used for the comparison only and never stored.
 */

export const DEFAULT_VERIFICATION_RADIUS_M = 100;
/** Samples less accurate than this are 'uncertain' (low_accuracy). */
export const MAX_ACCURACY_M = 50;
/** Samples older than this, or from the future, are 'uncertain' (stale/invalid). */
export const MAX_SAMPLE_AGE_MS = 30_000;
/** A sample may predate its challenge by at most this much. */
export const CHALLENGE_SKEW_MS = 5_000;
/** complete_quest() accepts an 'inside' check this long after it was made. */
export const CHECK_VALID_MS = 15 * 60_000;

export interface GeoPosition {
  latitude: number;
  longitude: number;
  /** Reported accuracy radius in metres. */
  accuracy: number;
  /** When the device captured the fix (ms since epoch). */
  capturedAt: number;
}

export type PresenceOutcome = "inside" | "outside" | "uncertain";
export type PresenceReason = "ok" | "outside_radius" | "ambiguous" | "stale_sample" | "low_accuracy" | "invalid_sample";

export type PresenceResult =
  | { ok: true; outcome: PresenceOutcome; reason: PresenceReason; checkId: string }
  | { ok: false; error: string };

/** Great-circle (haversine) distance in metres, mean Earth radius 6371 km. */
export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

/** The verify_gps_presence() decision, for LocalRepository parity and tests. */
export function classifyPresence(
  sample: GeoPosition | null | undefined,
  target: { latitude: number; longitude: number } | null,
  radiusM: number | null | undefined,
  context: { now: number; challengeCreatedAt: number },
): { outcome: PresenceOutcome; reason: PresenceReason } {
  const radius = radiusM ?? DEFAULT_VERIFICATION_RADIUS_M;
  if (
    !sample ||
    !target ||
    !Number.isFinite(sample.latitude) ||
    !Number.isFinite(sample.longitude) ||
    Math.abs(sample.latitude) > 90 ||
    Math.abs(sample.longitude) > 180 ||
    !(sample.accuracy > 0 && sample.accuracy <= 5000) ||
    !Number.isFinite(sample.capturedAt) ||
    sample.capturedAt > context.now + MAX_SAMPLE_AGE_MS
  ) {
    return { outcome: "uncertain", reason: "invalid_sample" };
  }
  if (
    sample.capturedAt < context.now - MAX_SAMPLE_AGE_MS ||
    sample.capturedAt < context.challengeCreatedAt - CHALLENGE_SKEW_MS
  ) {
    return { outcome: "uncertain", reason: "stale_sample" };
  }
  if (sample.accuracy > MAX_ACCURACY_M) return { outcome: "uncertain", reason: "low_accuracy" };
  const d = distanceM(sample.latitude, sample.longitude, target.latitude, target.longitude);
  if (d + sample.accuracy <= radius) return { outcome: "inside", reason: "ok" };
  if (d - sample.accuracy > radius) return { outcome: "outside", reason: "outside_radius" };
  return { outcome: "uncertain", reason: "ambiguous" };
}

/** Player-facing copy for a presence result that does not allow completion. */
export function presenceMessage(result: PresenceResult): string {
  if ("error" in result) {
    if (result.error === "location_unavailable")
      return "We couldn't get a precise location. Allow location access and try again in the open.";
    if (result.error === "rate_limited") return "Too many check-in attempts. Wait a few minutes and try again.";
    return "Check-in isn't available right now. Please try again.";
  }
  if (result.outcome === "outside") return "You seem to be outside this quest's area. Head to the spot and try again.";
  return "We couldn't confirm your location precisely enough. Wait for a better GPS signal and try again.";
}

/**
 * Ask the browser for one fresh, high-accuracy fix (never a cached one: the
 * server rejects samples taken before the challenge). Called only when the
 * player taps Complete on a gps quest. Resolves null when location is
 * unsupported, denied, or times out.
 */
export function requestPosition(timeoutMs = 15000): Promise<GeoPosition | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
          capturedAt: p.timestamp,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}
