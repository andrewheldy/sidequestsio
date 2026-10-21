import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from './Text';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Selectable filter chip (onPress) or static info pill (no onPress). */
export function Chip({
  label,
  icon,
  selected = false,
  onPress,
  tone,
}: {
  label: string;
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
  /** Static pill colour, e.g. colors.xp for reward pills. */
  tone?: string;
}) {
  const fg = tone ?? colors.text;
  const body = (
    <View style={styles.row}>
      {icon ? <Ionicons name={icon} size={16} color={fg} importantForAccessibility="no" accessibilityElementsHidden /> : null}
      <Text variant="small" color={fg} style={styles.label}>
        {label}
      </Text>
    </View>
  );
  if (!onPress) {
    return <View style={[styles.chip, tone ? { borderColor: tone } : null]}>{body}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      hitSlop={6}
      style={[styles.chip, styles.pressable, selected && styles.selected]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
    alignSelf: 'flex-start',
  },
  pressable: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.md },
  selected: { borderColor: colors.accent, borderWidth: 2, backgroundColor: colors.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  label: { fontWeight: '600' },
});
