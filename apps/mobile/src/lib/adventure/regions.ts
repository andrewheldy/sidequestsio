import type { AdventureState, GeofenceBundle } from '../storage/deviceStore';

// Conservative OS region budget on both platforms (iOS allows 20, Android 100).
export const TOTAL_REGION_BUDGET = 16;
export const MAX_CANDIDATE_REGIONS = 15;
export const REFRESH_REGION_PREFIX = 'refresh:';
/** Enter events this soon after registration are treated as "already inside", not arrival. */
export const INITIAL_EVENT_GRACE_MS = 90_000;

export type NativeRegion = {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number;
  notifyOnEnter: boolean;
  notifyOnExit: boolean;
};

const validRegion = (r: { latitude: number; longitude: number; radiusM: number }) =>
  Number.isFinite(r.latitude) && Number.isFinite(r.longitude) && Math.abs(r.latitude) <= 90 &&
  Math.abs(r.longitude) <= 180 && r.radiusM >= 100 && r.radiusM <= 5000;

/**
 * Regions to hand the OS: up to 15 candidate regions plus the refresh region,
 * within whatever budget other features leave. Only regions with a candidate
 * are monitored. Pure.
 */
export function planNativeRegions(bundle: GeofenceBundle, reservedByOtherFeatures = 0): NativeRegion[] {
  const available = Math.max(0, TOTAL_REGION_BUDGET - reservedByOtherFeatures);
  const refresh = bundle.refreshRegion && validRegion(bundle.refreshRegion) && available > 0 ? bundle.refreshRegion : null;
  const slots = Math.min(MAX_CANDIDATE_REGIONS, available - (refresh ? 1 : 0));
  const withCandidates = new Set(bundle.candidates.map((c) => c.regionId));

  const regions: NativeRegion[] = bundle.regions
    .filter((r) => validRegion(r) && withCandidates.has(r.id))
    .slice(0, Math.max(0, slots))
    .map((r) => ({ identifier: r.id, latitude: r.latitude, longitude: r.longitude, radius: r.radiusM, notifyOnEnter: true, notifyOnExit: true }));
  if (refresh) {
    regions.push({
      identifier: `${REFRESH_REGION_PREFIX}${refresh.id}`,
      latitude: refresh.latitude,
      longitude: refresh.longitude,
      radius: refresh.radiusM,
      notifyOnEnter: false,
      notifyOnExit: true,
    });
  }
  return regions;
}

export type RegionEvent = { type: 'enter' | 'exit'; regionId: string };

export type RegionDecision =
  | { action: 'process'; regionState: AdventureState['regionState'] }
  | { action: 'refresh'; regionState: AdventureState['regionState'] }
  | { action: 'ignore'; reason: 'unknown_region' | 'duplicate' | 'initial_inside' | 'exit'; regionState: AdventureState['regionState'] };

/**
 * Turns raw OS callbacks into at most one arrival per real transition:
 * registration-time "inside" reports, repeats and restarts do not count. Pure.
 */
export function classifyRegionEvent(state: AdventureState, event: RegionEvent, now: number): RegionDecision {
  const regionState = { ...state.regionState };
  if (event.regionId.startsWith(REFRESH_REGION_PREFIX)) {
    return event.type === 'exit' ? { action: 'refresh', regionState } : { action: 'ignore', reason: 'duplicate', regionState };
  }
  if (!state.bundle?.regions.some((r) => r.id === event.regionId)) {
    return { action: 'ignore', reason: 'unknown_region', regionState };
  }
  const previous = regionState[event.regionId];
  if (event.type === 'exit') {
    regionState[event.regionId] = 'outside';
    return { action: 'ignore', reason: 'exit', regionState };
  }
  regionState[event.regionId] = 'inside';
  if (previous === 'inside') return { action: 'ignore', reason: 'duplicate', regionState };
  if (previous === undefined && state.registeredAt != null && now - state.registeredAt < INITIAL_EVENT_GRACE_MS) {
    return { action: 'ignore', reason: 'initial_inside', regionState };
  }
  return { action: 'process', regionState };
}
