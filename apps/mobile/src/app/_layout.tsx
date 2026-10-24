import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAdventureLifecycle } from '../hooks/useAdventureLifecycle';
import { useNotificationRouting } from '../hooks/useNotificationRouting';
import { configureNotificationHandler } from '../lib/adventure/notifications';

export const unstable_settings = { anchor: '(tabs)' };

configureNotificationHandler();

export default function RootLayout() {
  useNotificationRouting();
  useAdventureLifecycle();

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="quests/[questId]" options={{ title: 'Quest detail' }} />
        <Stack.Screen name="settings/location" options={{ title: 'Location & nearby alerts' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
