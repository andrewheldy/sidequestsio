import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * One configuration path for the app. Values come from the build environment
 * (EXPO_PUBLIC_* is inlined by Metro) and app.config.ts `extra`.
 *
 * The production Supabase project is refused here: development and staging
 * builds must point at an approved non-production project. A missing or
 * refused backend yields `backend.status !== 'ready'`, which screens render as a
 * setup/error state. There is no fallback to fixtures or a demo user.
 */

/** Project ref of the live production database (CLAUDE.md §9). Never a dev backend. */
export const PRODUCTION_PROJECT_REF = 'wvedvngtuzsttpavmgjw';

export type BackendConfig =
  | { status: 'ready'; url: string; publishableKey: string; projectRef: string | null }
  | { status: 'missing'; message: string }
  | { status: 'refused'; message: string };

export function resolveBackend(
  url: string | undefined,
  publishableKey: string | undefined,
): BackendConfig {
  if (!url || !publishableKey) {
    return {
      status: 'missing',
      message:
        'This build has no backend configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY for an approved development or staging project.',
    };
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { status: 'missing', message: 'EXPO_PUBLIC_SUPABASE_URL is not a valid URL.' };
  }
  const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '10.0.2.2';
  if (!isLocal && parsed.protocol !== 'https:') {
    return { status: 'refused', message: 'The backend URL must use HTTPS.' };
  }
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
  const projectRef = hostname.endsWith('.supabase.co') ? hostname.split('.')[0] : null;
  if (projectRef === PRODUCTION_PROJECT_REF || hostname.includes(PRODUCTION_PROJECT_REF)) {
    return {
      status: 'refused',
      message:
        'This development/staging build is pointed at the production database. Use an approved non-production project.',
    };
  }
  return { status: 'ready', url: url.replace(/\/+$/, ''), publishableKey, projectRef };
}

const extra = (Constants.expoConfig?.extra ?? {}) as {
  appVariant?: string;
  scheme?: string;
  androidMapsConfigured?: boolean;
};

export const appVariant = extra.appVariant === 'staging' ? 'staging' : 'development';
export const appScheme = extra.scheme ?? `sidequests-${appVariant}`;

export const backend = resolveBackend(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

/** Website origin: policy pages and the only host accepted in scanned quest codes. */
export const webOrigin = (process.env.EXPO_PUBLIC_WEB_ORIGIN ?? 'https://miamisidequests.io').replace(/\/+$/, '');

/** Native map availability. iOS uses Apple Maps; Android needs a Google Maps key. */
export const mapsAvailable = Platform.OS === 'ios' || extra.androidMapsConfigured === true;

export const supportEmail = 'support@miamisidequests.io';

/** Legal/policy pages rendered by the website (docs/legal). */
export const policyLinks = {
  terms: `${webOrigin}/terms`,
  privacy: `${webOrigin}/privacy`,
  communityGuidelines: `${webOrigin}/community-guidelines`,
  deleteAccount: `${webOrigin}/delete-account`,
} as const;

// ---------------------------------------------------------------------------
// Location discovery and Adventure (docs/product/LOCATION_DISCOVERY.md)
// ---------------------------------------------------------------------------

// EXPO_PUBLIC_* values are inlined at build time and ship in the app: only the
// publishable key belongs here, never a service-role key.
export type AppConfig = {
  /** Empty unless resolveBackend accepts it, so the production project stays refused here too. */
  supabaseUrl: string;
  supabaseKey: string;
  /**
   * Nearby discovery (location-ranked Explore). Off unless explicitly 'on': it
   * needs migration 0023 (discover_nearby, get_quest_card) on the backend.
   */
  nearbyEnabled: boolean;
  /** Adventure UI and geofence registration. Off unless explicitly 'on'. */
  adventureEnabled: boolean;
  /** The native build declares background location (MOBILE_BACKGROUND_LOCATION=1). */
  backgroundBuild: boolean;
  /** Android has an approved Google Maps key; iOS always uses Apple Maps. */
  androidMap: boolean;
};

export function getConfig(): AppConfig {
  const native = (Constants.expoConfig?.extra ?? {}) as { backgroundLocation?: boolean; androidMapsConfigured?: boolean };
  const resolved = resolveBackend(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return {
    supabaseUrl: resolved.status === 'ready' ? resolved.url : '',
    supabaseKey: resolved.status === 'ready' ? resolved.publishableKey : '',
    nearbyEnabled: process.env.EXPO_PUBLIC_FEATURE_NEARBY === 'on',
    adventureEnabled: process.env.EXPO_PUBLIC_FEATURE_ADVENTURE === 'on',
    backgroundBuild: native.backgroundLocation === true,
    androidMap: native.androidMapsConfigured === true,
  };
}

/** Version of the in-app Adventure disclosure the consent records refer to. */
export const ADVENTURE_DISCLOSURE_VERSION = 'adventure-2026-10-24-draft';
