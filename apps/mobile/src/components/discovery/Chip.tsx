import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

type Props = { label: string; selected?: boolean; onPress: () => void; accessibilityLabel?: string };

/** Selection is conveyed by role state and a check mark, not color alone. */
export function Chip({ label, selected = false, onPress, accessibilityLabel }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{selected ? `✓ ${label}` : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  selected: { borderColor: colors.ink, backgroundColor: colors.ink },
  label: { color: colors.ink, fontSize: 14, fontWeight: '500' },
  selectedLabel: { color: colors.surface },
});
