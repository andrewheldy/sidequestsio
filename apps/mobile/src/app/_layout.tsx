import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="quests/[questId]" options={{ title: 'Quest detail' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
