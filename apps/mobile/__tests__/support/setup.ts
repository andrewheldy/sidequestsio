/* Native-module test doubles. These prove JS behaviour only, not device behaviour. */
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void store.delete(k)),
    __store: store,
  };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MapView = React.forwardRef((props: Record<string, unknown>, _ref: unknown) =>
    React.createElement(View, { testID: 'map-view', ...props }),
  );
  const Marker = (props: Record<string, unknown>) => React.createElement(View, { testID: 'map-marker', ...props });
  return { __esModule: true, default: MapView, Marker, PROVIDER_DEFAULT: undefined };
});

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'undetermined', granted: false, canAskAgain: true })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied', granted: false, canAskAgain: true })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 25.79, longitude: -80.19 } })),
  Accuracy: { Balanced: 3 },
}));

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CameraView: (props: Record<string, unknown>) => React.createElement(View, { testID: 'camera-view', ...props }),
    useCameraPermissions: jest.fn(() => [{ granted: false, canAskAgain: true, status: 'undetermined' }, jest.fn()]),
  };
});

// Icon fonts load through the native asset registry; render a stub instead.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Icon = ({ name, testID }: { name: string; testID?: string }) =>
    React.createElement(View, { testID: testID ?? `icon-${name}` });
  return { Ionicons: Icon, MaterialCommunityIcons: Icon };
});
