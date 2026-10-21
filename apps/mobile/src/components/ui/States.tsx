import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import { Button } from './Button';
import { Text } from './Text';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text muted>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  message,
  icon = 'compass-outline',
  action,
}: {
  title: string;
  message?: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={40} color={colors.textMuted} importantForAccessibility="no" accessibilityElementsHidden />
      <Text variant="heading" style={styles.centerText} accessibilityRole="header">
        {title}
      </Text>
      {message ? (
        <Text muted style={styles.centerText}>
          {message}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

/** Error with an optional retry. Never shows fabricated fallback content. */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle-outline" size={40} color={colors.error} importantForAccessibility="no" accessibilityElementsHidden />
      <Text variant="heading" style={styles.centerText} accessibilityRole="header">
        {title}
      </Text>
      {message ? (
        <Text muted style={styles.centerText}>
          {message}
        </Text>
      ) : null}
      {onRetry ? <Button label={retryLabel} variant="secondary" icon="refresh" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  centerText: { textAlign: 'center' },
});
