import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, ErrorState, LoadingState, Screen, SetupRequired } from '../../components/ui';
import {
  clearPendingReturn,
  decodeReturnTarget,
  encodeReturnTarget,
  hrefForTarget,
  loadPendingReturn,
  type ReturnTarget,
} from '../../lib/navigation/returnTo';
import { useSession } from '../../session/SessionProvider';
import { spacing } from '../../theme/tokens';

/** The intended destination: the validated `returnTo` param, else the persisted pending return. */
export async function resolveReturnTarget(returnToParam: unknown): Promise<ReturnTarget | null> {
  return decodeReturnTarget(returnToParam) ?? (await loadPendingReturn());
}

/**
 * The one post-auth router. Once the session settles:
 *   ready            -> returnTo (param, else pending), else Explore
 *   needs_onboarding -> /onboarding carrying the same destination
 * Uses replace so Back never loops through auth screens. `onboarding: false`
 * (used by the onboarding screen itself) disables the second rule; `enabled: false`
 * turns the hook off (password recovery must never continue to a quest).
 */
export function usePostAuthRouting(returnToParam: unknown, options: { onboarding?: boolean; enabled?: boolean } = {}) {
  const { onboarding = true, enabled = true } = options;
  const router = useRouter();
  const { state } = useSession();
  const status = state.status;
  // Screens kept in the stack beneath the visible one must not navigate on its behalf.
  const focused = useIsFocused();

  useEffect(() => {
    if (!enabled || !focused) return;
    if (status !== 'ready' && !(onboarding && status === 'needs_onboarding')) return;
    let cancelled = false;
    void (async () => {
      const target = await resolveReturnTarget(returnToParam);
      if (cancelled) return;
      if (status === 'needs_onboarding') {
        router.replace({ pathname: '/onboarding', params: target ? { returnTo: encodeReturnTarget(target) } : {} });
        return;
      }
      await clearPendingReturn();
      if (!cancelled) router.replace(hrefForTarget(target));
    })();
    return () => {
      cancelled = true;
    };
  }, [status, returnToParam, onboarding, enabled, focused, router]);
}

/** Profile load failure: retry or sign out (shared by auth + onboarding screens). */
export function ProfileErrorPanel({ message }: { message: string }) {
  const { refreshProfile, signOut } = useSession();
  return (
    <View style={styles.panel}>
      <ErrorState
        title="We could not load your profile"
        message={message}
        onRetry={() => void refreshProfile()}
        retryLabel="Try again"
      />
      <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
    </View>
  );
}

/**
 * Wraps the guest-facing auth forms. Renders children only for guests; shows
 * loading / retry / setup states otherwise and forwards signed-in users.
 */
export function AuthStateGate({ returnTo, children }: PropsWithChildren<{ returnTo?: unknown }>) {
  const { state } = useSession();
  usePostAuthRouting(returnTo);

  if (state.status === 'guest') return <>{children}</>;
  if (state.status === 'unconfigured') {
    return (
      <Screen>
        <SetupRequired />
      </Screen>
    );
  }
  if (state.status === 'error') {
    return (
      <Screen>
        <ProfileErrorPanel message={state.message} />
      </Screen>
    );
  }
  const label = state.status === 'loading_profile' ? 'Loading your profile…' : state.status === 'restoring' ? 'Loading…' : 'Taking you there…';
  return (
    <Screen>
      <LoadingState label={label} />
    </Screen>
  );
}

const styles = StyleSheet.create({ panel: { flexGrow: 1, gap: spacing.sm, justifyContent: 'center' } });
