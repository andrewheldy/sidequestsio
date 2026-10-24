import type { ConfigContext, ExpoConfig } from 'expo/config';
import { withInfoPlist, type ConfigPlugin } from 'expo/config-plugins';

// Expo auto-applies expo-task-manager's plugin, which declares Background Fetch.
// Region monitoring does not use it, so the artifact should not claim it.
const withoutBackgroundFetch: ConfigPlugin = (config) =>
  withInfoPlist(config, (mod) => {
    const modes = (mod.modResults.UIBackgroundModes as string[] | undefined)?.filter((m) => m !== 'fetch');
    if (modes?.length) mod.modResults.UIBackgroundModes = modes;
    else delete mod.modResults.UIBackgroundModes;
    return mod;
  });

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = process.env.APP_VARIANT ?? 'development';
  if (variant !== 'development' && variant !== 'staging') {
    throw new Error('APP_VARIANT must be development or staging. Production is not configured.');
  }

  const bundleIdentifier = process.env.MOBILE_IOS_BUNDLE_IDENTIFIER;
  const applicationId = process.env.MOBILE_ANDROID_APPLICATION_ID;
  const nativeTarget = process.env.MOBILE_NATIVE_TARGET ?? process.env.EAS_BUILD_PLATFORM;
  if (nativeTarget === 'ios' && !bundleIdentifier) {
    throw new Error('Set an approved MOBILE_IOS_BUNDLE_IDENTIFIER for this APP_VARIANT before building iOS.');
  }
  if (nativeTarget === 'android' && !applicationId) {
    throw new Error('Set an approved MOBILE_ANDROID_APPLICATION_ID for this APP_VARIANT before building Android.');
  }
  // Optional. Without it Android shows the quest list only (iOS uses Apple Maps, no key).
  const androidMapsKey = process.env.MOBILE_ANDROID_GOOGLE_MAPS_API_KEY;
  const scheme = `sidequests-${variant}`;
  // Background location is opt-in per build so a foreground-only artifact can
  // ship if store review rejects background access (docs/product/LOCATION_DISCOVERY.md).
  const backgroundLocation = process.env.MOBILE_BACKGROUND_LOCATION === '1';

  return withoutBackgroundFetch({
    ...config,
    name: `SideQuests (${variant === 'staging' ? 'Staging' : 'Dev'})`,
    slug: 'sidequests-consumer',
    version: '0.1.0',
    platforms: ['ios', 'android'],
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    backgroundColor: '#07111F',
    scheme,
    plugins: [
      'expo-router',
      'expo-dev-client',
      'expo-status-bar',
      'expo-secure-store',
      'expo-image',
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'SideQuests uses your location to show quests near you and, when you ask, to check you in at a quest.',
          locationAlwaysAndWhenInUsePermission: backgroundLocation
            ? 'With nearby alerts on, SideQuests uses your location in the background to notice when you are near an eligible quest. It uses proximity checks, not a route history. Pause anytime in Settings.'
            : false,
          locationAlwaysPermission: false,
          motionUsagePermission: false,
          // Region monitoring needs Always authorization only, not continuous background updates.
          isIosBackgroundLocationEnabled: false,
          isAndroidBackgroundLocationEnabled: backgroundLocation,
          isAndroidForegroundServiceEnabled: false,
        },
      ],
      // Camera scans the venue's quest QR code. No microphone.
      [
        'expo-camera',
        {
          cameraPermission: 'SideQuests uses the camera to scan the quest code at the venue.',
          recordAudioAndroid: false,
          barcodeScannerEnabled: true,
        },
      ],
      'expo-notifications',
      ['react-native-maps', androidMapsKey ? { androidGoogleMapsApiKey: androidMapsKey } : {}],
    ],
    ios: {
      supportsTablet: false,
      ...(bundleIdentifier ? { bundleIdentifier } : {}),
      // Lets Linking.canOpenURL detect a mail app for support / deletion-request emails.
      infoPlist: { LSApplicationQueriesSchemes: ['mailto'] },
    },
    android: { ...(applicationId ? { package: applicationId } : {}) },
    extra: {
      appVariant: variant,
      scheme,
      androidMapsConfigured: Boolean(androidMapsKey),
      backgroundLocation,
    },
  });
};
