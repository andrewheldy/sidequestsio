/** A device position. Held in memory only: never persisted, logged or put in a URL. */
export type LocationSample = {
  latitude: number;
  longitude: number;
  /** Reported horizontal accuracy in meters; null when the OS gives none. */
  accuracyM: number | null;
  /** Epoch milliseconds when the OS captured the fix. */
  capturedAt: number;
  source: 'last_known' | 'current' | 'watch';
};

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export type LocationPermissions = {
  servicesEnabled: boolean;
  foreground: PermissionStatus;
  background: PermissionStatus;
  /** False when the user chose approximate location (Android) or reduced accuracy (iOS). */
  precise: boolean;
  canAskForeground: boolean;
};

/** How far a sample can be trusted for showing distances. */
export type SampleQuality = 'precise' | 'stale' | 'coarse' | 'unusable';
