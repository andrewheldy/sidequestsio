import AsyncStorage from '@react-native-async-storage/async-storage';

// Per-installation state, readable from a background task with no React tree.
// Never holds device coordinates: region centers are public quest locations.

export type DesiredMode = 'manual' | 'explore' | 'adventure';

export type DeviceSettings = {
  installationId: string;
  desiredMode: DesiredMode;
  /** Explicit pause; never cleared automatically. */
  adventurePaused: boolean;
  selectedAreaId: string | null;
  radiusKm: number;
};

export type RegionPlan = { id: string; latitude: number; longitude: number; radiusM: number; questIds: string[] };

export type NudgeCandidate = {
  questId: string;
  regionId: string;
  title: string;
  category: string;
  xpReward: number;
  pointsReward: number;
  estimatedMinutes: number | null;
  venueId: string | null;
};

export type GeofenceBundle = {
  version: string;
  expiresAt: string;
  deliveryEnabled: boolean;
  /** Null when no public area centroid is close enough to anchor a refresh region. */
  coverage: { areaId: string; label: string } | null;
  refreshRegion: Omit<RegionPlan, 'questIds'> | null;
  regions: RegionPlan[];
  candidates: NudgeCandidate[];
};

export type AdventureState = {
  /**
   * The gate every geofence callback checks first. Flipped off before any
   * awaited cleanup, so a racing callback cannot notify after a pause.
   */
  gateOpen: boolean;
  /** Account the cached bundle and regions belong to. */
  ownerUserId: string | null;
  bundle: GeofenceBundle | null;
  registeredVersion: string | null;
  registeredAt: number | null;
  regionState: Record<string, 'inside' | 'outside'>;
  /** Local processing ledger, keyed by idempotency key; bounded and pruned. */
  processing: Record<string, { state: 'claiming' | 'done'; at: number }>;
  /** Quest ids with the time this device last scheduled a nudge for them. */
  recentQuests: Record<string, number>;
};

const SETTINGS_KEY = 'sq.device.v1';
const ADVENTURE_KEY = 'sq.adventure.v1';

export const DEFAULT_ADVENTURE_STATE: AdventureState = {
  gateOpen: false,
  ownerUserId: null,
  bundle: null,
  registeredVersion: null,
  registeredAt: null,
  regionState: {},
  processing: {},
  recentQuests: {},
};

function newInstallationId() {
  const random = globalThis.crypto?.randomUUID?.();
  if (random) return random;
  // Not a secret, only a stable per-install identifier.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function readJson<T>(key: string): Promise<Partial<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Partial<T>) : null;
  } catch {
    return null;
  }
}

export async function loadSettings(): Promise<DeviceSettings> {
  const stored = await readJson<DeviceSettings>(SETTINGS_KEY);
  const settings: DeviceSettings = {
    installationId: stored?.installationId ?? newInstallationId(),
    desiredMode: stored?.desiredMode ?? 'manual',
    adventurePaused: stored?.adventurePaused ?? false,
    selectedAreaId: stored?.selectedAreaId ?? null,
    radiusKm: stored?.radiusKm ?? 3,
  };
  if (!stored?.installationId) await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  return settings;
}

export async function saveSettings(patch: Partial<Omit<DeviceSettings, 'installationId'>>) {
  const next = { ...(await loadSettings()), ...patch };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export async function loadAdventureState(): Promise<AdventureState> {
  return { ...DEFAULT_ADVENTURE_STATE, ...(await readJson<AdventureState>(ADVENTURE_KEY)) };
}

export async function saveAdventureState(patch: Partial<AdventureState>) {
  const next = { ...(await loadAdventureState()), ...patch };
  await AsyncStorage.setItem(ADVENTURE_KEY, JSON.stringify(next));
  return next;
}

/** Drops everything person-specific (sign-out, opt-out, account switch). */
export async function clearAdventureState() {
  await AsyncStorage.setItem(ADVENTURE_KEY, JSON.stringify(DEFAULT_ADVENTURE_STATE));
}
