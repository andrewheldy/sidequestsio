import { Text as RNText, type TextProps } from 'react-native';
import { colors, typography, type TextVariant } from '../../theme/tokens';

type Props = TextProps & { variant?: TextVariant; muted?: boolean; color?: string };

export function Text({ variant = 'body', muted = false, color, style, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      maxFontSizeMultiplier={rest.maxFontSizeMultiplier ?? 2}
      style={[typography[variant], { color: color ?? (muted ? colors.textMuted : colors.text) }, style]}
    />
  );
}
