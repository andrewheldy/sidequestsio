import * as Location from 'expo-location';
import { getSession, type Session } from '../auth/session';
import { ADVENTURE_DISCLOSURE_VERSION } from '../config';
import { getCurrent, getLastKnown, getPermissions } from '../location/adapter';
import { assessSample } from '../location/quality';
import type { LocationSample } from '../location/types';
import {
  clearAdventureState,
  loadAdventureState,
  loadSettings,
  saveAdventureState,
  saveSettings,
} from '../storage/deviceStore';
import { cancelNudges, notificationsGranted } from './notifications';
import { planNativeRegions } from './regions';
import { fetchGeofenceBundle, syncInstallation } from './server';

export const GEOFENCE_TASK = 'sidequests-geofence';

export type StopReason = 'pause' | 'mode_change' | 'sign_out' | 'account_switch' | 'revoked' | 'remote_disabled';

/**
 * Stops Adventure processing on this device. The persisted gate closes first,
 * before any awaited native or network work, so a racing geofence callback
 * reads a closed gate. Works offline; the server is reconciled best effort.
 */
export async function stopAdventure(reason: StopReason, session?: Session | null) {
  await saveAdventureState({ gateOpen: false });
  if (reason === 'pause') await saveSettings({ adventurePaused: true });

  try {
    if (await Location.hasStartedGeofencingAsync(GEOFENCE_TASK)) await Location.stopGeofencingAsync(GEOFENCE_TASK);
  } catch {
    // Not registered, or the module is unavailable; nothing to unregister.
  }
  await cancelNudges().catch(() => undefined);
  if (reason === 'sign_out' || reason === 'account_switch') await clearAdventureState();
  else await saveAdventureState({ bundle: null, registeredVersion: null, registeredAt: null, regionState: {} });

  const active = session === undefined ? await getSession() : session;
  if (active && reason !== 'account_switch') {
    const { installationId, adventurePaused } = await loadSettings();
    await syncInstallation(active, installationId, {
      adventureEnabled: reason === 'pause',
      paused: reason === 'pause' || adventurePaused,
      consentVersion: ADVENTURE_DISCLOSURE_VERSION,
    }).catch(() => undefined);
  }
}

export type StartResult = { ok: true; regions: number } | { ok: false; reason: string };

/**
 * Fetches a bundle around an actual, fresh device sample and registers its
 * regions. Never called with a manually chosen or map-browsed origin.
 */
export async function startAdventure(sample: LocationSample, now = Date.now()): Promise<StartResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: 'sign_in' };
  const settings = await loadSettings();
  if (settings.desiredMode !== 'adventure' || settings.adventurePaused) return { ok: false, reason: 'paused' };
  if (assessSample(sample, now) !== 'precise') return { ok: false, reason: 'location_quality' };
  const permissions = await getPermissions();
  if (permissions.background !== 'granted' || !(await notificationsGranted())) return { ok: false, reason: 'permissions' };

  await syncInstallation(session, settings.installationId, {
    adventureEnabled: true,
    paused: false,
    consentVersion: ADVENTURE_DISCLOSURE_VERSION,
  }).catch(() => undefined);
  const bundle = await fetchGeofenceBundle(session, sample, settings.installationId, { timeoutMs: 8_000 });
  if (!bundle.ok) return { ok: false, reason: bundle.error };

  const regions = planNativeRegions(bundle.data);
  const previous = await loadAdventureState();
  await saveAdventureState({
    ownerUserId: session.userId,
    bundle: bundle.data,
    // Region state survives a refresh only for regions that are still monitored.
    regionState: previous.ownerUserId === session.userId ? keep(previous.regionState, regions.map((r) => r.identifier)) : {},
  });
  try {
    if (regions.length === 0) {
      if (await Location.hasStartedGeofencingAsync(GEOFENCE_TASK)) await Location.stopGeofencingAsync(GEOFENCE_TASK);
    } else {
      await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
    }
  } catch {
    await saveAdventureState({ gateOpen: false, registeredVersion: null });
    return { ok: false, reason: 'registration_failed' };
  }
  // Re-check: a pause during the awaits above must win.
  const latest = await loadSettings();
  if (latest.adventurePaused || latest.desiredMode !== 'adventure') {
    await stopAdventure('mode_change', session);
    return { ok: false, reason: 'paused' };
  }
  await saveAdventureState({ gateOpen: true, registeredVersion: bundle.data.version, registeredAt: Date.now() });
  return { ok: true, regions: regions.length };
}

function keep(state: Record<string, 'inside' | 'outside'>, ids: string[]) {
  return Object.fromEntries(Object.entries(state).filter(([id]) => ids.includes(id)));
}

/**
 * Background refresh after leaving the refresh region: only with a fresh,
 * precise last-known fix the OS already has. Otherwise wait for foreground use
 * rather than guessing a position from a region center.
 */
export async function refreshBundleInBackground() {
  const sample = await getLastKnown();
  if (!sample || assessSample(sample, Date.now()) !== 'precise') return;
  await startAdventure(sample).catch(() => undefined);
}

/**
 * On app foreground: stop if a prerequisite was revoked, otherwise refresh an
 * expired or missing registration with a fresh foreground sample.
 */
export async function reconcileAdventure(active: boolean) {
  const state = await loadAdventureState();
  if (!active) {
    if (state.gateOpen || state.registeredVersion) await stopAdventure('revoked');
    return;
  }
  const expired = !state.bundle || Date.parse(state.bundle.expiresAt) <= Date.now();
  if (!state.gateOpen || expired || state.registeredVersion !== state.bundle?.version) {
    const sample = await getCurrent({ precise: true });
    if (sample) await startAdventure(sample);
  }
}

/** Sign-out or a different account: the old user's regions and alerts must not survive. */
export async function handleSessionChange(next: Session | null) {
  const state = await loadAdventureState();
  if (!state.ownerUserId && !state.gateOpen) return;
  if (!next) await stopAdventure('sign_out', null);
  else if (next.userId !== state.ownerUserId) await stopAdventure('account_switch', null);
}
