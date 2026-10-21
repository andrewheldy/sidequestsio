import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createQueryClient } from '../lib/queryClient';
import { SessionProvider } from '../session/SessionProvider';
import { colors } from '../theme/tokens';

export const unstable_settings = { anchor: '(tabs)' };

const stackOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  headerTitleStyle: { color: colors.text },
  contentStyle: { backgroundColor: colors.background },
  headerBackButtonDisplayMode: 'minimal' as const,
};

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <StatusBar style="light" />
          <Stack screenOptions={stackOptions}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="quests/[questId]/index" options={{ title: 'Quest', headerShown: false }} />
            <Stack.Screen name="quests/[questId]/complete" options={{ title: 'Complete quest' }} />
            <Stack.Screen name="auth/sign-in" options={{ title: 'Sign in' }} />
            <Stack.Screen name="auth/sign-up" options={{ title: 'Create account' }} />
            <Stack.Screen name="auth/verify-email" options={{ title: 'Check your email' }} />
            <Stack.Screen name="auth/forgot-password" options={{ title: 'Reset password' }} />
            <Stack.Screen name="auth/reset-password" options={{ title: 'New password' }} />
            <Stack.Screen name="auth/callback" options={{ title: '', headerShown: false }} />
            <Stack.Screen name="onboarding/index" options={{ title: 'Get started', headerShown: false }} />
            <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
          </Stack>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
