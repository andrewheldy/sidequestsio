// Native modules have no JS implementation under Jest. These mocks keep the
// UI and logic tests honest about what they cover: no device behavior.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  const MapView = ({ children, ...props }: { children?: unknown }) => require('react').createElement(View, props, children);
  const Marker = (props: object) => require('react').createElement(View, props);
  return { __esModule: true, default: MapView, Marker };
});

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: false, status: 'undetermined' })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false, status: 'denied' })),
  setNotificationChannelAsync: jest.fn(async () => null),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  getPresentedNotificationsAsync: jest.fn(async () => []),
  dismissNotificationAsync: jest.fn(async () => undefined),
  getLastNotificationResponse: jest.fn(() => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('expo-task-manager', () => ({
  isTaskDefined: jest.fn(() => false),
  defineTask: jest.fn(),
}));

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3, Highest: 6 },
  LocationGeofencingEventType: { Enter: 1, Exit: 2 },
  hasServicesEnabledAsync: jest.fn(async () => true),
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'undetermined', granted: false, canAskAgain: true })),
  getBackgroundPermissionsAsync: jest.fn(async () => ({ status: 'undetermined', granted: false, canAskAgain: true })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied', granted: false, canAskAgain: false })),
  requestBackgroundPermissionsAsync: jest.fn(async () => ({ status: 'denied', granted: false, canAskAgain: false })),
  getLastKnownPositionAsync: jest.fn(async () => null),
  getCurrentPositionAsync: jest.fn(async () => null),
  watchPositionAsync: jest.fn(async () => ({ remove: jest.fn() })),
  startGeofencingAsync: jest.fn(async () => undefined),
  stopGeofencingAsync: jest.fn(async () => undefined),
  hasStartedGeofencingAsync: jest.fn(async () => false),
}));
