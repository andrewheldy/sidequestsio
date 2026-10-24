import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAdventureLifecycle } from '../hooks/useAdventureLifecycle';
import { useNotificationRouting } from '../hooks/useNotificationRouting';
import { configureNotificationHandler } from '../lib/adventure/notifications';
import { createQueryClient } from '../lib/queryClient';
import { SessionProvider } from '../session/SessionProvider';
import { colors } from '../theme/tokens';

export const unstable_settings = { anchor: '(tabs)' };

configureNotificationHandler();

const stackOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  headerTitleStyle: { color: colors.text },
  contentStyle: { backgroundColor: colors.background },
  headerBackButtonDisplayMode: 'minimal' as const,
};

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  useNotificationRouting();
  useAdventureLifecycle();

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <StatusBar style="light" />
          <Stack screenOptions={stackOptions}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="quests/[questId]/index" options={{ title: 'Quest', headerShown: false }} />
            <Stack.Screen name="quests/[questId]/complete" options={{ title: 'Complete quest' }} />
            <Stack.Screen name="nearby" options={{ title: 'Quests near you' }} />
            <Stack.Screen name="auth/sign-in" options={{ title: 'Sign in' }} />
            <Stack.Screen name="auth/sign-up" options={{ title: 'Create account' }} />
            <Stack.Screen name="auth/verify-email" options={{ title: 'Check your email' }} />
            <Stack.Screen name="auth/forgot-password" options={{ title: 'Reset password' }} />
            <Stack.Screen name="auth/reset-password" options={{ title: 'New password' }} />
            <Stack.Screen name="auth/callback" options={{ title: '', headerShown: false }} />
            <Stack.Screen name="onboarding/index" options={{ title: 'Get started', headerShown: false }} />
            <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
            <Stack.Screen name="settings/location" options={{ title: 'Location & nearby alerts' }} />
          </Stack>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
