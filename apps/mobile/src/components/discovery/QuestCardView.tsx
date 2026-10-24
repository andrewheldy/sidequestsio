import { Link } from 'expo-router';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORY_LABELS, formatAvailability, formatDistance, reasonLabel, type Units } from '../../lib/discovery/format';
import type { QuestCard } from '../../lib/discovery/types';
import { colors } from '../theme';

type Props = { quest: QuestCard; units: Units; distanceContext: 'device' | 'area' | 'approximate' };

/** Opens the platform maps app for directions; SideQuests does no routing. */
export function openDirections(quest: Pick<QuestCard, 'latitude' | 'longitude' | 'title'>) {
  const destination = `${quest.latitude},${quest.longitude}`;
  const url =
    Platform.OS === 'ios'
      ? `https://maps.apple.com/?daddr=${destination}`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  Linking.openURL(url).catch(() => undefined);
}

export function QuestCardView({ quest, units, distanceContext }: Props) {
  const distance = formatDistance(quest.distanceM, units, distanceContext);
  const reasons = quest.reasons.map(reasonLabel).filter((r): r is string => !!r).slice(0, 2);
  const meta = [CATEGORY_LABELS[quest.category] ?? quest.category, quest.locationLabel ?? quest.venueName, distance].filter(Boolean);
  const duration = quest.estimatedMinutes ? `About ${quest.estimatedMinutes} min` : 'Duration not listed';

  return (
    <View style={styles.card}>
      {quest.isSponsored && <Text style={styles.sponsored}>Sponsored</Text>}
      <Text accessibilityRole="header" style={styles.title}>{quest.title}</Text>
      <Text style={styles.meta}>{meta.join(' · ')}</Text>
      <Text style={styles.meta}>{`${formatAvailability(quest)} · ${duration}`}</Text>
      {quest.accessNotes ? <Text style={styles.meta}>{quest.accessNotes}</Text> : null}
      <View style={styles.rewards}>
        <Text style={styles.reward}>{`${quest.xpReward} XP`}</Text>
        <Text style={styles.reward}>{`${quest.pointsReward} Points`}</Text>
      </View>
      {reasons.length > 0 && <Text style={styles.reason}>{reasons.join(' · ')}</Text>}
      <View style={styles.actions}>
        <Link href={{ pathname: '/quests/[questId]', params: { questId: quest.id } }} asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={`Open quest ${quest.title}`} style={styles.primary}>
            <Text style={styles.primaryLabel}>Open quest</Text>
          </Pressable>
        </Link>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Directions to ${quest.title} in your maps app`}
          onPress={() => openDirections(quest)}
          style={styles.secondary}
        >
          <Text style={styles.secondaryLabel}>Directions</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  sponsored: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '600', color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 6 },
  title: { fontSize: 18, fontWeight: '600', color: colors.ink },
  meta: { fontSize: 14, color: colors.text },
  rewards: { flexDirection: 'row', gap: 8, marginTop: 4 },
  reward: { fontSize: 14, fontWeight: '600', color: colors.gold, backgroundColor: colors.goldBg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  reason: { fontSize: 13, color: colors.ocean },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  primary: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.ink },
  primaryLabel: { color: colors.surface, fontWeight: '600', fontSize: 15 },
  secondary: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: colors.ink, paddingHorizontal: 16 },
  secondaryLabel: { color: colors.ink, fontWeight: '600', fontSize: 15 },
});
