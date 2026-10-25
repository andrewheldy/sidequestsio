import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { accentGradient, colors, radii, spacing, touchTarget } from '../../theme/tokens';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  /** Spoken label when it should differ from the visible one. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link';
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  style,
  testID,
}: Props) {
  const inactive = disabled || loading;
  const fg = variant === 'primary' ? colors.text : variant === 'danger' ? colors.error : colors.text;
  const content = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator color={fg} accessibilityElementsHidden />
      ) : icon ? (
        <Ionicons name={icon} size={20} color={fg} accessibilityElementsHidden importantForAccessibility="no" />
      ) : null}
      <Text variant="button" color={fg}>
        {label}
      </Text>
    </View>
  );
  return (
    <Pressable
      testID={testID}
      onPress={inactive ? undefined : onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        inactive && styles.inactive,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={accentGradient} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.gradient}>
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: touchTarget, borderRadius: radii.pill, overflow: 'hidden', justifyContent: 'center' },
  gradient: { minHeight: touchTarget, justifyContent: 'center', paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.md },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.error },
  inactive: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
