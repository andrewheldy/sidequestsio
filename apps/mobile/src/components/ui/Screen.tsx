import type { PropsWithChildren, ReactElement } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type RefreshControlProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme/tokens';

type Props = PropsWithChildren<{
  /** Scroll the content (default). Set false for screens that manage their own lists/maps. */
  scroll?: boolean;
  /** Safe-area edges. Tab screens omit 'bottom' (the tab bar handles it). */
  edges?: Edge[];
  /** Lift content above the keyboard for forms. */
  keyboard?: boolean;
  padded?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function Screen({
  children,
  scroll = true,
  edges = ['top', 'left', 'right'],
  keyboard = false,
  padded = true,
  refreshControl,
  contentStyle,
}: Props) {
  const inner = scroll ? (
    <ScrollView
      contentContainerStyle={[padded && styles.padded, styles.grow, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, padded && styles.padded, contentStyle]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {keyboard ? (
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  grow: { flexGrow: 1 },
  padded: { padding: spacing.md, gap: spacing.md },
});
