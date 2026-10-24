import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { openDirections } from '../../components/discovery/QuestCardView';
import { colors } from '../../components/theme';
import { getSession } from '../../lib/auth/session';
import { getQuestCard } from '../../lib/discovery/api';
import { CATEGORY_LABELS, formatAvailability } from '../../lib/discovery/format';
import type { QuestCardResponse } from '../../lib/discovery/types';
import { checkInWithGps, presenceMessage } from '../../lib/presence/checkIn';

const UNAVAILABLE: Record<string, string> = {
  completed: 'You’ve already completed this quest.',
  cooldown: 'You’ve done this one recently. It will be available again later.',
  inactive: 'This quest isn’t available right now.',
  expired: 'This quest has ended.',
  not_found: 'We couldn’t find this quest.',
};

export default function QuestDetailScreen() {
  const { questId } = useLocalSearchParams<{ questId: string }>();
  const [result, setResult] = useState<QuestCardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Always fresh server state: a notification or an old list may point at a
  // quest that has since paused, ended or been completed.
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const session = await getSession();
      const response = await getQuestCard(questId, { signal: controller.signal, accessToken: session?.accessToken });
      if (controller.signal.aborted) return;
      if (response.ok) setResult(response.data);
      else setError(response.error);
    })();
    return () => controller.abort();
  }, [questId]);

  const onCheckIn = async () => {
    const session = await getSession();
    if (!session) return setCheckIn('Sign in to check in with GPS. You can still scan the venue’s QR code.');
    setChecking(true);
    setCheckIn(presenceMessage(await checkInWithGps(session, questId)));
    setChecking(false);
  };

  const quest = result?.state === 'available' || result?.state === 'completed' || result?.state === 'cooldown' ? result.quest : null;

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {!result && !error && <ActivityIndicator accessibilityLabel="Loading quest" />}
        {error && (
          <Text style={styles.body}>
            {error === 'not_configured' ? `Quest ID: ${questId}` : 'We couldn’t load this quest. Check your connection and try again.'}
          </Text>
        )}
        {result && result.state !== 'available' && (
          <View style={styles.panel} accessibilityLiveRegion="polite">
            <Text style={styles.body}>{UNAVAILABLE[result.state]}</Text>
            <Link href="/" asChild>
              <Pressable accessibilityRole="link">
                <Text style={styles.link}>See other quests nearby</Text>
              </Pressable>
            </Link>
          </View>
        )}
        {quest && (
          <>
            <Text accessibilityRole="header" style={styles.title}>{quest.title}</Text>
            <Text style={styles.meta}>
              {[CATEGORY_LABELS[quest.category] ?? quest.category, quest.locationLabel ?? quest.venueName].filter(Boolean).join(' · ')}
            </Text>
            <Text style={styles.meta}>{formatAvailability(quest)}</Text>
            <View style={styles.row}>
              <Text style={styles.reward}>{`${quest.xpReward} XP`}</Text>
              <Text style={styles.reward}>{`${quest.pointsReward} Points`}</Text>
            </View>
            {quest.description ? <Text style={styles.body}>{quest.description}</Text> : null}
            {quest.accessNotes ? <Text style={styles.body}>{quest.accessNotes}</Text> : null}
            <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => openDirections(quest)}>
              <Text style={styles.secondaryLabel}>Directions in your maps app</Text>
            </Pressable>
            {result?.state === 'available' && quest.verificationType === 'gps' && (
              <Pressable accessibilityRole="button" style={styles.primary} onPress={onCheckIn} disabled={checking}>
                <Text style={styles.primaryLabel}>{checking ? 'Checking…' : 'Check in with GPS'}</Text>
              </Pressable>
            )}
            {checkIn && <Text accessibilityLiveRegion="polite" style={styles.body}>{checkIn}</Text>}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: '600', color: colors.ink },
  meta: { fontSize: 15, color: colors.text },
  body: { fontSize: 16, lineHeight: 24, color: colors.text },
  row: { flexDirection: 'row', gap: 8 },
  reward: { fontSize: 14, fontWeight: '600', color: colors.gold, backgroundColor: colors.goldBg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  panel: { gap: 8, padding: 14, borderRadius: 12, backgroundColor: colors.subtle },
  link: { color: colors.ocean, fontWeight: '600', fontSize: 15, paddingVertical: 6 },
  primary: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.ink },
  primaryLabel: { color: colors.surface, fontWeight: '600', fontSize: 16 },
  secondary: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: colors.ink },
  secondaryLabel: { color: colors.ink, fontWeight: '600', fontSize: 16 },
});
