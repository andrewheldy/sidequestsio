import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { Button, Card, EmptyState, ErrorState, LoadingState, Screen, SetupRequired, Text } from '../../components/ui';
import { getProgress } from '../../lib/api/progress';
import { backend } from '../../lib/config';
import { queryKeys } from '../../lib/queryClient';
import type { Progress } from '../../lib/types';
import { sessionOf } from '../../session/sessionState';
import { useSession } from '../../session/SessionProvider';
import { colors, spacing } from '../../theme/tokens';
import { availabilityLabel, listActiveRewards } from './api';

export function RewardsScreen() {
  const router = useRouter();
  const { state } = useSession();
  const userId = sessionOf(state)?.user.id ?? null;
  const signedIn = userId != null;

  const progress = useQuery({
    queryKey: queryKeys.account.progress(userId ?? ''),
    queryFn: () => getProgress(userId as string),
    enabled: backend.status === 'ready' && signedIn,
  });
  const rewards = useQuery({
    queryKey: queryKeys.rewards.available(),
    queryFn: () => listActiveRewards(),
    enabled: backend.status === 'ready' && signedIn,
  });

  if (backend.status !== 'ready' || state.status === 'unconfigured') {
    return (
      <Screen>
        <SetupRequired />
      </Screen>
    );
  }
  if (state.status === 'restoring') {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (!signedIn) {
    return (
      <Screen>
        <Text variant="title" accessibilityRole="header">
          Rewards
        </Text>
        <Card title="Points & XP">
          <Text>Complete quests at partner venues to earn Points and XP.</Text>
          <Text muted>Points are your spendable reward balance. XP builds your explorer level and can&apos;t be spent.</Text>
          <Button label="Sign in to see your Points" onPress={() => router.push({ pathname: '/auth/sign-in', params: { returnTo: 'tab:rewards' } })} />
        </Card>
      </Screen>
    );
  }

  const refreshing = (progress.isRefetching || rewards.isRefetching) && !progress.isPending && !rewards.isPending;
  const refresh = () => {
    void progress.refetch();
    void rewards.refetch();
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}>
      <Text variant="title" accessibilityRole="header">
        Rewards
      </Text>

      <Card title="Your balance">
        <Balance progress={progress.data} pending={progress.isPending} failed={progress.isError} onRetry={() => void progress.refetch()} />
      </Card>

      <Card title="Available rewards">
        {rewards.isPending ? (
          <LoadingState label="Loading rewards…" />
        ) : rewards.isError ? (
          <ErrorState title="Couldn't load rewards" message="Check your connection and try again." onRetry={() => void rewards.refetch()} />
        ) : rewards.data.length === 0 ? (
          <EmptyState icon="gift-outline" title="No rewards available yet." message="Points you earn stay in your balance." />
        ) : (
          <View style={styles.list}>
            {rewards.data.map((reward) => (
              <View key={reward.id} style={styles.reward}>
                <Text variant="heading">{reward.title}</Text>
                {reward.description ? <Text muted>{reward.description}</Text> : null}
                <Text variant="small" color={colors.points}>
                  {reward.points_cost} Points
                </Text>
                <Text variant="small" muted>
                  {availabilityLabel(reward)}
                </Text>
              </View>
            ))}
            <Text variant="small" muted>
              Redeeming rewards isn&apos;t available in the app yet. Your Points stay in your balance.
            </Text>
          </View>
        )}
      </Card>
    </Screen>
  );
}

function Balance({ progress, pending, failed, onRetry }: { progress: Progress | null | undefined; pending: boolean; failed: boolean; onRetry: () => void }) {
  if (pending) return <LoadingState label="Loading your balance…" />;
  if (failed || !progress) {
    return (
      <ErrorState
        title="Balance unavailable"
        message={failed ? "We couldn't load your Points and XP right now." : "Your Points and XP aren't available yet."}
        onRetry={onRetry}
      />
    );
  }
  return (
    <View style={styles.list}>
      <View>
        <Text variant="display" color={colors.points} accessibilityLabel={`${progress.points_balance_cache} Points`}>
          {progress.points_balance_cache}
        </Text>
        <Text muted>Points (spendable)</Text>
      </View>
      <View>
        <Text variant="heading" color={colors.xp}>
          Level {progress.level} · {progress.xp} XP
        </Text>
        <Text variant="small" muted>
          XP is progression only and can&apos;t be spent.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  reward: { gap: spacing.xxs, paddingVertical: spacing.xs },
});
