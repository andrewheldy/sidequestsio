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

  return {
    ...config,
    name: `SideQuests (${variant === 'staging' ? 'Staging' : 'Dev'})`,
    slug: 'sidequests-consumer',
    version: '0.1.0',
    platforms: ['ios', 'android'],
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    scheme: `sidequests-${variant}`,
    plugins: ['expo-router', 'expo-dev-client', 'expo-status-bar'],
    ios: { supportsTablet: false, ...(bundleIdentifier ? { bundleIdentifier } : {}) },
    android: { ...(applicationId ? { package: applicationId } : {}) },
  };
};
