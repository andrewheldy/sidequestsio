import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { Chip, Text } from '../../components/ui';
import { colors, radii, spacing } from '../../theme/tokens';
import type { QuestWithContext } from '../../lib/types';
import { formatMiles } from './geo';
import { categoryIcon, categoryLabel, neighborhoodOf, questImage } from './questFormat';

/** XP (level progress) and Points (spendable) shown as two distinct pills. */
export function RewardPills({ xp, points }: { xp: number; points: number }) {
  return (
    <View style={styles.pills}>
      <Chip icon="flash" label={`${xp} XP`} tone={colors.xp} />
      <Chip icon="ellipse-outline" label={`${points} Points`} tone={colors.success} />
    </View>
  );
}

export function QuestCard({
  quest,
  miles,
  selected = false,
  onPress,
}: {
  quest: QuestWithContext;
  /** Only passed when the user's location and the venue coordinates are both known. */
  miles?: number | null;
  selected?: boolean;
  onPress: () => void;
}) {
  const image = questImage(quest);
  const place = [quest.venue?.name, neighborhoodOf(quest)].filter(Boolean).join(' · ');
  const distance = miles != null ? formatMiles(miles) : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${quest.title}${place ? `, ${place}` : ''}`}
      accessibilityHint="Opens quest details"
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.image} contentFit="cover" accessibilityIgnoresInvertColors />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Ionicons name={categoryIcon(quest.category)} size={36} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.body}>
        <Text variant="heading">{quest.title}</Text>
        <View style={styles.meta}>
          <Chip icon={categoryIcon(quest.category)} label={categoryLabel(quest.category)} />
          {distance ? <Chip icon="location-outline" label={distance} /> : null}
        </View>
        {place ? (
          <Text variant="small" muted>
            {place}
          </Text>
        ) : null}
        <RewardPills xp={quest.xp_reward} points={quest.points_reward} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  selected: { borderColor: colors.accent, borderWidth: 2 },
  pressed: { opacity: 0.9 },
  image: { width: '100%', height: 140 },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  body: { padding: spacing.md, gap: spacing.xs },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
