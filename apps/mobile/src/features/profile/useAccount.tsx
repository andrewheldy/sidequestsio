import { useRouter } from 'expo-router';
import { useRef, type ReactNode } from 'react';
import { View } from 'react-native';
import { Button, EmptyState, ErrorState, LoadingState, SetupRequired } from '../../components/ui';
import { encodeReturnTarget } from '../../lib/navigation/returnTo';
import type { AccountProfile } from '../../lib/types';
import { useSession } from '../../session/SessionProvider';
import { profileOf, sessionOf } from '../../session/sessionState';
import { spacing } from '../../theme/tokens';

const returnTo = encodeReturnTarget({ kind: 'tab', tab: 'profile' });

export interface ReadyAccount {
  userId: string;
  email: string | null;
  profile: AccountProfile;
}

/**
 * Resolves the session into either a ready account or the state screen to show
 * instead. While the profile reloads after a save (status loading_profile) the
 * last loaded profile of the same user is kept, so forms are not torn down.
 */
export function useAccount(): { account: ReadyAccount | null; gate: ReactNode } {
  const { state, userId, refreshProfile, signOut } = useSession();
  const router = useRouter();
  const last = useRef<AccountProfile | null>(null);
  const loaded = profileOf(state);
  if (loaded) last.current = loaded;
  if (!userId || (last.current && last.current.user_id !== userId)) last.current = loaded;

  const usable = state.status === 'ready' || state.status === 'loading_profile';
  if (userId && usable && last.current) {
    return { account: { userId, email: sessionOf(state)?.user.email ?? null, profile: last.current }, gate: null };
  }

  switch (state.status) {
    case 'unconfigured':
      return { account: null, gate: <SetupRequired /> };
    case 'restoring':
    case 'loading_profile':
      return { account: null, gate: <LoadingState label="Loading your profile…" /> };
    case 'guest':
      return {
        account: null,
        gate: (
          <EmptyState
            icon="person-circle-outline"
            title="Your explorer profile"
            message="Sign in or create a free account to track your level, XP and Points, and see the quests you've completed."
            action={
              <View style={{ gap: spacing.sm, alignSelf: 'stretch' }}>
                <Button label="Sign in" onPress={() => router.push({ pathname: '/auth/sign-in', params: { returnTo } })} />
                <Button
                  label="Create account"
                  variant="secondary"
                  onPress={() => router.push({ pathname: '/auth/sign-up', params: { returnTo } })}
                />
              </View>
            }
          />
        ),
      };
    case 'needs_onboarding':
      return {
        account: null,
        gate: (
          <EmptyState
            icon="sparkles-outline"
            title="Finish setting up"
            message="Complete a quick intro so we can personalise your quests."
            action={<Button label="Finish setup" onPress={() => router.push({ pathname: '/onboarding', params: { returnTo } })} />}
          />
        ),
      };
    default:
      return {
        account: null,
        gate: (
          <View style={{ gap: spacing.sm }}>
            <ErrorState
              title="Couldn't load your profile"
              message={state.status === 'error' ? state.message : undefined}
              onRetry={() => void refreshProfile()}
              retryLabel="Retry"
            />
            <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
          </View>
        ),
      };
  }
}
