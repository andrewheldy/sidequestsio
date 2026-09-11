/**
 * THE FEED — Pulse identity tokens (TypeScript mirror of tokens.css for SVG/inline uses).
 * Palette locked by docs/brand/THE_FEED_BRAND_IDENTITY.md §5. A unit test asserts this
 * file and tokens.css never drift apart.
 */
export const colors = {
  pulseLime: '#cdef40',
  feedBlack: '#050706',
  carbon: '#111411',
  graphite: '#262a27',
  signalWhite: '#f4f5f1',
  staticGray: '#a7aca7',
  darkLime: '#64761e',
  success: '#3ad17a',
  warning: '#f1c84a',
  error: '#f05d5e',
  info: '#61a9ff',
} as const

/** Map of tokens.css custom-property names to expected values, used by the drift test. */
export const cssTokenContract: Record<string, string> = {
  '--feed-pulse-lime': colors.pulseLime,
  '--feed-black': colors.feedBlack,
  '--feed-carbon': colors.carbon,
  '--feed-graphite': colors.graphite,
  '--feed-signal-white': colors.signalWhite,
  '--feed-static-gray': colors.staticGray,
  '--feed-dark-lime': colors.darkLime,
  '--feed-success': colors.success,
  '--feed-warning': colors.warning,
  '--feed-error': colors.error,
  '--feed-info': colors.info,
}

export const typography = {
  display: "'Space Grotesk Variable', 'Inter Variable', 'Helvetica Neue', Arial, sans-serif",
  body: "'Inter Variable', 'Helvetica Neue', Arial, sans-serif",
} as const

/** Motion tokens — restrained by design; all motion must respect reduced-motion settings. */
export const motion = {
  fast: 150,
  base: 250,
  slow: 450,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const
