import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Button, Card, ErrorState, Screen, Text } from '../../components/ui';
import { getProgress, listCompletions, type CompletionWithQuest } from '../../lib/api/progress';
import { queryKeys } from '../../lib/queryClient';
import type { AccountProfile, Progress } from '../../lib/types';
import { colors, radii, spacing, touchTarget } from '../../theme/tokens';
import { avatarUri, formatDate, initialsOf } from './format';
import { useAccount } from './useAccount';

export function ProfileScreen() {
  const { account, gate } = useAccount();
  if (!account) {
    return (
      <Screen>
        {gate}
      </Screen>
    );
  }
  return <ReadyProfile userId={account.userId} profile={account.profile} />;
}

function ReadyProfile({ userId, profile }: { userId: string; profile: AccountProfile }) {
  const router = useRouter();
  const progress = useQuery({ queryKey: queryKeys.account.progress(userId), queryFn: () => getProgress(userId) });
  const completions = useQuery({ queryKey: queryKeys.account.completions(userId), queryFn: () => listCompletions(userId) });
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.allSettled([progress.refetch(), completions.refetch()]);
    setRefreshing(false);
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.accent} />}>
      <View style={styles.topRow}>
        <Text variant="overline" muted accessibilityRole="header">
          Profile
        </Text>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={8}
          style={styles.gear}
        >
          <Ionicons name="settings-outline" size={24} color={colors.text} importantForAccessibility="no" />
        </Pressable>
      </View>

      <Identity profile={profile} />

      <Card title="Progress">
        <ProgressSection
          loading={progress.isPending}
          error={progress.isError}
          data={progress.data}
          onRetry={() => void progress.refetch()}
        />
      </Card>

      <Card title="Completed quests">
        <History
          loading={completions.isPending}
          error={completions.isError}
          data={completions.data}
          onRetry={() => void completions.refetch()}
          onOpen={(questId) => router.push({ pathname: '/quests/[questId]', params: { questId } })}
          onExplore={() => router.navigate('/')}
        />
      </Card>
    </Screen>
  );
}

function Identity({ profile }: { profile: AccountProfile }) {
  const uri = avatarUri(profile.avatar_url);
  const name = profile.display_name?.trim() || 'Explorer';
  const area = profile.home_city?.trim() || profile.starting_area?.trim() || null;
  return (
    <View style={styles.identity}>
      {uri ? (
        <Image source={{ uri }} style={styles.avatar} accessibilityLabel={`${name}'s avatar`} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.initials]} accessibilityLabel="Avatar" accessible>
          <Text variant="title">{initialsOf(profile.display_name)}</Text>
        </View>
      )}
      <View style={styles.identityText}>
        <Text variant="title" accessibilityRole="header">
          {name}
        </Text>
        {profile.username ? <Text muted>@{profile.username}</Text> : null}
        {area ? <Text muted>{area}</Text> : null}
      </View>
    </View>
  );
}

function ProgressSection({
  loading,
  error,
  data,
  onRetry,
}: {
  loading: boolean;
  error: boolean;
  data: Progress | null | undefined;
  onRetry: () => void;
}) {
  if (loading) return <Text muted>Loading your progress…</Text>;
  if (error || !data) {
    return (
      <View style={styles.gap}>
        <Text muted accessibilityLiveRegion="polite">
          Progress unavailable right now.
        </Text>
        <Button label="Retry progress" variant="secondary" icon="refresh" onPress={onRetry} />
      </View>
    );
  }
  return (
    <View style={styles.stats}>
      <Stat label="Level" value={String(data.level)} />
      <Stat label="XP" caption="Progression" value={data.xp.toLocaleString()} color={colors.xp} />
      <Stat label="Points" caption="Spendable" value={data.points_balance_cache.toLocaleString()} color={colors.points} />
    </View>
  );
}

function Stat({ label, caption, value, color }: { label: string; caption?: string; value: string; color?: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}${caption ? `, ${caption}` : ''}: ${value}`}>
      <Text variant="title" color={color}>
        {value}
      </Text>
      <Text variant="caption" muted>
        {label}
      </Text>
      {caption ? (
        <Text variant="small" muted>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

function History({
  loading,
  error,
  data,
  onRetry,
  onOpen,
  onExplore,
}: {
  loading: boolean;
  error: boolean;
  data: CompletionWithQuest[] | undefined;
  onRetry: () => void;
  onOpen: (questId: string) => void;
  onExplore: () => void;
}) {
  if (loading) return <Text muted>Loading your history…</Text>;
  if (error || !data) {
    return (
      <View style={styles.gap}>
        <Text muted accessibilityLiveRegion="polite">
          Your history is unavailable right now.
        </Text>
        <Button label="Retry history" variant="secondary" icon="refresh" onPress={onRetry} />
      </View>
    );
  }
  if (data.length === 0) {
    return (
      <View style={styles.gap}>
        <Text variant="heading">No completed quests yet</Text>
        <Text muted>Scan a code at a partner venue to finish your first quest.</Text>
        <Button label="Explore quests" onPress={onExplore} />
      </View>
    );
  }
  return (
    <View>
      {data.map((c) => {
        const title = c.quest?.title ?? 'Completed quest';
        const date = formatDate(c.completed_at);
        return (
          <Pressable
            key={c.id}
            onPress={() => onOpen(c.quest_id)}
            accessibilityRole="button"
            accessibilityLabel={`${title}, ${date}, ${c.xp_awarded} XP, ${c.points_awarded} points`}
            style={styles.completion}
          >
            <View style={styles.identityText}>
              <Text variant="bodyStrong">{title}</Text>
              <Text variant="small" muted>
                {date}
              </Text>
            </View>
            <View style={styles.awards}>
              <Text variant="small" color={colors.xp}>
                +{c.xp_awarded} XP
              </Text>
              <Text variant="small" color={colors.points}>
                +{c.points_awarded} pts
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gear: { minWidth: touchTarget, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 72, height: 72, borderRadius: radii.pill },
  initials: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  identityText: { flex: 1, gap: spacing.xxs },
  gap: { gap: spacing.sm },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, gap: 2 },
  completion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touchTarget,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  awards: { alignItems: 'flex-end' },
});
