import Constants from 'expo-constants';

// EXPO_PUBLIC_* values are inlined at build time and ship in the app: only the
// publishable key belongs here, never a service-role key.
export type AppConfig = {
  supabaseUrl: string;
  supabaseKey: string;
  /** Foreground nearby discovery (Explore mode). On unless explicitly 'off'. */
  nearbyEnabled: boolean;
  /** Adventure UI and geofence registration. Off unless explicitly 'on'. */
  adventureEnabled: boolean;
  /** The native build declares background location (MOBILE_BACKGROUND_LOCATION=1). */
  backgroundBuild: boolean;
  /** Android has an approved Google Maps key; iOS always uses Apple Maps. */
  androidMap: boolean;
};

export function getConfig(): AppConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as { backgroundLocation?: boolean; androidMap?: boolean };
  return {
    supabaseUrl: (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, ''),
    supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
    nearbyEnabled: process.env.EXPO_PUBLIC_FEATURE_NEARBY !== 'off',
    adventureEnabled: process.env.EXPO_PUBLIC_FEATURE_ADVENTURE === 'on',
    backgroundBuild: extra.backgroundLocation === true,
    androidMap: extra.androidMap === true,
  };
}

/** Version of the in-app Adventure disclosure the consent records refer to. */
export const ADVENTURE_DISCLOSURE_VERSION = 'adventure-2026-10-24-draft';
