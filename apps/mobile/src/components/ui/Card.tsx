import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from './Text';

type Props = PropsWithChildren<{ title?: string; style?: StyleProp<ViewStyle> }>;

/** Section surface with an optional overline title (reference: "YOUR QUEST", "REWARDS"). */
export function Card({ title, style, children }: Props) {
  return (
    <View style={[styles.card, style]}>
      {title ? (
        <Text variant="overline" muted accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
});
