import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, EmptyState, LoadingState, Screen, SetupRequired } from '../../components/ui';
import { clearPendingReturn } from '../../lib/navigation/returnTo';
import { requireSupabase } from '../../lib/supabase';
import { classifyAuthError, messageForKind } from '../../features/account/authErrors';
import { parseCallbackParams, type CallbackParams } from '../../features/account/callbackParams';
import { ProfileErrorPanel, usePostAuthRouting } from '../../features/account/postAuth';
import { useSession } from '../../session/SessionProvider';
import { spacing } from '../../theme/tokens';

type Phase = 'working' | 'failed';

/**
 * Codes this app instance has exchanged successfully. A failed exchange is only
 * treated as a harmless replay when the same code already worked here; an
 * existing session alone proves nothing (it may belong to another account).
 */
const exchangedCodes = new Set<string>();

/**
 * Deep-link landing for email confirmation and password recovery
 * (`<scheme>://auth/callback?code=…&flow=signup|recovery`). Only the expected
 * params are read; token values are never displayed or logged. Failures end on
 * a static recovery screen, so there is no redirect loop.
 */
export default function AuthCallback() {
  const raw = useLocalSearchParams<Record<string, string | string[]>>();
  const params = parseCallbackParams(raw);
  return <CallbackBody params={params} />;
}

function CallbackBody({ params }: { params: CallbackParams }) {
  const router = useRouter();
  const { state } = useSession();
  const [phase, setPhase] = useState<Phase>('working');
  const [failure, setFailure] = useState<string | null>(null);
  const exchanged = useRef<string | null>(null);

  const { code, flow, hasError } = params;
  // Signup flow: once the exchange yields a session and the provider settles, route onward.
  // Recovery goes to reset-password instead and must never continue to a quest.
  usePostAuthRouting(undefined, { enabled: flow !== 'recovery' });

  const configured = state.status !== 'unconfigured';
  const isGuest = state.status === 'guest';

  // Exchange the one-time code exactly once per code (the ref survives re-renders and strict-mode replays).
  useEffect(() => {
    if (!configured) return;
    if (hasError) {
      setFailure(messageForKind('link_expired'));
      setPhase('failed');
      return;
    }
    if (!code || exchanged.current === code) return;
    exchanged.current = code;
    void (async () => {
      try {
        const sb = requireSupabase();
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error && !exchangedCodes.has(code)) {
          setFailure(messageForKind(classifyAuthError(error) === 'network' ? 'network' : 'link_expired'));
          setPhase('failed');
          return;
        }
        exchangedCodes.add(code);
        if (flow === 'recovery') {
          // Recovery never continues to a quest: drop any pending quest return first.
          await clearPendingReturn();
          router.replace('/auth/reset-password');
        }
      } catch (e) {
        setFailure(messageForKind(classifyAuthError(e as Error) === 'network' ? 'network' : 'link_expired'));
        setPhase('failed');
      }
    })();
  }, [code, flow, hasError, configured, router]);

  // No code: fine if the user is already signed in (the routing hook moves on); otherwise a dead link.
  useEffect(() => {
    if (configured && !code && !hasError && isGuest) {
      setFailure('This link is missing information. Request a new one.');
      setPhase('failed');
    }
  }, [code, hasError, configured, isGuest]);

  if (state.status === 'unconfigured') {
    return (
      <Screen>
        <SetupRequired />
      </Screen>
    );
  }
  if (phase === 'failed') {
    const recovery = flow === 'recovery';
    return (
      <Screen>
        <EmptyState
          icon="link-outline"
          title={recovery ? 'Reset link not valid' : 'Confirmation link not valid'}
          message={failure ?? undefined}
          action={
            <View style={{ gap: spacing.xs, alignSelf: 'stretch' }}>
              <Button
                label="Request a new link"
                onPress={() => router.replace(recovery ? '/auth/forgot-password' : '/auth/sign-in')}
              />
              <Button label="Go to sign in" variant="ghost" onPress={() => router.replace('/auth/sign-in')} />
              <Button label="Keep browsing" variant="ghost" onPress={() => router.replace('/')} />
            </View>
          }
        />
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
  return (
    <Screen>
      <LoadingState label={flow === 'recovery' ? 'Checking your reset link…' : 'Confirming your email…'} />
    </Screen>
  );
}
