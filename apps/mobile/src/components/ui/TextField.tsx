import { useState, type ComponentRef, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radii, spacing, touchTarget, typography } from '../../theme/tokens';
import { Text } from './Text';

type Props = TextInputProps & { label: string; error?: string | null; hint?: string; ref?: Ref<ComponentRef<typeof TextInput>> };

/** Labelled input. Pass native autofill props (textContentType, autoComplete) through. */
export function TextField({ label, error, hint, style, ref, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text variant="caption" muted nativeID={`${label}-label`}>
        {label}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors.disabled}
        selectionColor={colors.accent}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[styles.input, focused && styles.focused, !!error && styles.invalid, style]}
      />
      {error ? (
        <Text variant="small" color={colors.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small" muted>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xxs },
  input: {
    ...typography.body,
    minHeight: touchTarget,
    color: colors.text,
    backgroundColor: colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  focused: { borderColor: colors.focus },
  invalid: { borderColor: colors.error },
});
