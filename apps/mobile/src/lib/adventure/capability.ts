import type { LocationPermissions } from '../location/types';
import type { DesiredMode } from '../storage/deviceStore';

export type CapabilityInput = {
  desiredMode: DesiredMode;
  paused: boolean;
  nearbyEnabled: boolean;
  adventureEnabled: boolean;
  backgroundBuild: boolean;
  signedIn: boolean;
  permissions: LocationPermissions | null;
  notificationsGranted: boolean;
};

export type AdventureBlocker =
  | 'flag_off'
  | 'build_without_background'
  | 'sign_in'
  | 'location_services'
  | 'foreground_permission'
  | 'background_permission'
  | 'precise_location'
  | 'notifications'
  | 'paused';

export type Capability = {
  /** What is actually running, which can be less than what the user chose. */
  effectiveMode: DesiredMode;
  canUseDeviceLocation: boolean;
  adventureActive: boolean;
  adventureBlockers: AdventureBlocker[];
  summary: string;
};

/** Desired mode vs. effective capability (docs/product/LOCATION_DISCOVERY.md §2). Pure. */
export function computeCapability(input: CapabilityInput): Capability {
  const p = input.permissions;
  const canUseDeviceLocation =
    input.nearbyEnabled && !!p && p.servicesEnabled && p.foreground === 'granted' && input.desiredMode !== 'manual';

  const blockers: AdventureBlocker[] = [];
  if (input.desiredMode === 'adventure') {
    if (!input.adventureEnabled) blockers.push('flag_off');
    if (!input.backgroundBuild) blockers.push('build_without_background');
    if (!input.signedIn) blockers.push('sign_in');
    if (!p?.servicesEnabled) blockers.push('location_services');
    if (p?.foreground !== 'granted') blockers.push('foreground_permission');
    if (p?.background !== 'granted') blockers.push('background_permission');
    if (p?.foreground === 'granted' && !p.precise) blockers.push('precise_location');
    if (!input.notificationsGranted) blockers.push('notifications');
    if (input.paused) blockers.push('paused');
  }
  const adventureActive = input.desiredMode === 'adventure' && blockers.length === 0;
  const effectiveMode: DesiredMode = adventureActive ? 'adventure' : canUseDeviceLocation ? 'explore' : 'manual';

  return { effectiveMode, canUseDeviceLocation, adventureActive, adventureBlockers: blockers, summary: summarize(input, effectiveMode, blockers) };
}

const BLOCKER_COPY: Record<AdventureBlocker, string> = {
  flag_off: 'Nearby alerts are not available in this version yet.',
  build_without_background: 'Nearby alerts are not available in this version yet.',
  sign_in: 'Nearby alerts need you to sign in.',
  location_services: 'Nearby alerts need location services turned on.',
  foreground_permission: 'Nearby alerts need location permission.',
  background_permission: 'Nearby alerts need background location (“Always”) permission.',
  precise_location: 'Nearby alerts need precise location.',
  notifications: 'Nearby alerts need notification permission.',
  paused: 'Nearby alerts are paused.',
};

function summarize(input: CapabilityInput, effective: DesiredMode, blockers: AdventureBlocker[]) {
  if (effective === 'adventure') return 'Adventure is on. You may get up to a few nearby alerts a day.';
  const base = effective === 'explore' ? 'Explore is on.' : 'Browsing by area.';
  if (input.desiredMode === 'adventure') return `${base} ${BLOCKER_COPY[blockers[0]]}`;
  if (input.desiredMode === 'explore' && effective === 'manual') return `${base} Location is off, so results follow the area you choose.`;
  return base;
}
