import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/ui';
import { colors, radii, spacing, touchTarget } from '../../theme/tokens';

/** Labelled checkbox row. Consent is only ever set by the user pressing this. */
export function CheckRow({
  checked,
  onToggle,
  label,
  children,
  testID,
}: {
  checked: boolean;
  onToggle: () => void;
  /** Spoken label (children may contain inline links). */
  label: string;
  children: ReactNode;
  testID?: string;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        testID={testID}
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked }}
        hitSlop={8}
        style={styles.box}
      >
        <Ionicons
          name={checked ? 'checkbox' : 'square-outline'}
          size={26}
          color={checked ? colors.accent : colors.textMuted}
          importantForAccessibility="no"
          accessibilityElementsHidden
        />
      </Pressable>
      <View style={styles.label}>{children}</View>
    </View>
  );
}

export function FormMessage({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  const color = tone === 'error' ? colors.error : colors.success;
  return (
    <View style={[styles.message, { borderColor: color }]} accessibilityLiveRegion="polite">
      <Text variant="small" color={color}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  box: { minWidth: touchTarget - 8, minHeight: touchTarget - 8, justifyContent: 'center', alignItems: 'center' },
  label: { flex: 1, paddingTop: spacing.xs + 2 },
  message: { borderWidth: 1, borderRadius: radii.md, padding: spacing.sm },
});
