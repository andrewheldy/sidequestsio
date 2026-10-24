import * as Location from 'expo-location';
import { LAST_KNOWN_MAX_AGE_MS, LOCATION_WAIT_MS, isValidCoordinate } from './quality';
import type { LocationPermissions, LocationSample, PermissionStatus } from './types';

// The only module that imports expo-location for foreground use; screens and
// logic depend on the application types above.

function status(value: string): PermissionStatus {
  return value === 'granted' ? 'granted' : value === 'denied' ? 'denied' : 'undetermined';
}

function toSample(position: Location.LocationObject | null, source: LocationSample['source']): LocationSample | null {
  if (!position) return null;
  const { latitude, longitude, accuracy } = position.coords;
  if (!isValidCoordinate(latitude, longitude)) return null;
  return { latitude, longitude, accuracyM: accuracy ?? null, capturedAt: position.timestamp, source };
}

export async function getPermissions(): Promise<LocationPermissions> {
  const [servicesEnabled, foreground, background] = await Promise.all([
    Location.hasServicesEnabledAsync().catch(() => false),
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync().catch(() => null),
  ]);
  return {
    servicesEnabled,
    foreground: status(foreground.status),
    background: background ? status(background.status) : 'undetermined',
    precise: isPrecise(foreground),
    canAskForeground: foreground.canAskAgain,
  };
}

function isPrecise(permission: Location.LocationPermissionResponse) {
  if (permission.status !== 'granted') return false;
  if (permission.android) return permission.android.accuracy === 'fine';
  if (permission.ios) return permission.ios.accuracy !== 'reduced';
  return true;
}

export async function requestForeground() {
  await Location.requestForegroundPermissionsAsync();
  return getPermissions();
}

/** Only call after the in-app disclosure; Android 11+ sends the user to Settings. */
export async function requestBackground() {
  await Location.requestBackgroundPermissionsAsync();
  return getPermissions();
}

export async function getLastKnown(maxAgeMs = LAST_KNOWN_MAX_AGE_MS) {
  const position = await Location.getLastKnownPositionAsync({ maxAge: maxAgeMs }).catch(() => null);
  return toSample(position, 'last_known');
}

/**
 * A fresh fix with a bounded wait. A late answer after the deadline is
 * ignored rather than replacing newer state.
 */
export async function getCurrent(options: { waitMs?: number; precise?: boolean } = {}) {
  const accuracy = options.precise ? Location.Accuracy.Highest : Location.Accuracy.Balanced;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), options.waitMs ?? LOCATION_WAIT_MS);
  });
  try {
    const position = await Promise.race([Location.getCurrentPositionAsync({ accuracy }).catch(() => null), deadline]);
    return toSample(position, 'current');
  } finally {
    clearTimeout(timer);
  }
}

/** Foreground-only watch; the caller must stop it when the screen or app goes inactive. */
export async function watch(onSample: (sample: LocationSample) => void) {
  const subscription = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, distanceInterval: 200, timeInterval: 30_000 },
    (position) => {
      const sample = toSample(position, 'watch');
      if (sample) onSample(sample);
    },
  );
  return () => subscription.remove();
}
