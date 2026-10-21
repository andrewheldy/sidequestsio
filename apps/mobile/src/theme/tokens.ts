/**
 * Mobile design tokens. Colours come from the canonical dark semantic palette
 * (brand/colors/semantic-colors.json); the coral→magenta "neon" accent and the
 * dark, location-led layout follow docs/design/mobile/*-reference.png.
 * Colour is reserved for progress, rewards, actions and status (DESIGN_SYSTEM.md).
 */
export const colors = {
  background: '#07111F',
  backgroundSubtle: '#0D1321',
  surface: '#182235',
  surfaceRaised: '#26344C',
  border: '#26344C',
  borderStrong: '#3B4B64',
  text: '#FCFAF5',
  textMuted: '#BEC6D2',
  textInverse: '#07111F',
  primary: '#F8F3E8',
  secondary: '#5B8AF2',
  success: '#3FA877',
  warning: '#F2B94B',
  error: '#FF6F61',
  xp: '#F2B94B',
  points: '#F2B94B',
  focus: '#F2B94B',
  disabled: '#4A5668',
  accent: '#FF5E8A',
  scrim: 'rgba(7, 17, 31, 0.72)',
} as const;

/** Primary CTA / selected-tab gradient (reference: coral → magenta). */
export const accentGradient = ['#FF7A45', '#FF3E8A', '#B23CFF'] as const;

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radii = { sm: 8, md: 14, lg: 20, pill: 999 } as const;

/** Minimum touch target (iOS 44pt / Android 48dp). */
export const touchTarget = 48;

/** System fonts; sizes scale with the OS text-size setting (allowFontScaling default). */
export const typography = {
  display: { fontSize: 32, lineHeight: 36, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800' as const, letterSpacing: -0.3 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '800' as const, letterSpacing: 2, textTransform: 'uppercase' as const },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '700' as const },
} as const;

export type TextVariant = keyof typeof typography;
