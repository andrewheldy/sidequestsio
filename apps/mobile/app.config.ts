import type { ConfigContext, ExpoConfig } from 'expo/config';

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

  return {
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
      // Foreground "when in use" only. No background location is requested or declared.
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'SideQuests uses your location only when you ask for quests near you.',
          isIosBackgroundLocationEnabled: false,
          isAndroidBackgroundLocationEnabled: false,
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
    },
  };
};
