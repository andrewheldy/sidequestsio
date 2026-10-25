import { colors as tokens } from '../theme/tokens';

// Role names used by the location screens (nearby, settings/location,
// components/discovery), mapped onto the app's dark palette in theme/tokens.ts
// so they match the rest of the app. `ink` is foreground (text, outlines,
// primary-button fill) and `surface` is the screen background (and the label on
// `ink` buttons), so the pairings stay legible.
export const colors = {
  ink: tokens.text,
  text: tokens.text,
  muted: tokens.textMuted,
  border: tokens.borderStrong,
  surface: tokens.background,
  subtle: tokens.surface,
  ocean: tokens.secondary,
  gold: tokens.xp,
  goldBg: tokens.surfaceRaised,
  palm: tokens.success,
  error: tokens.error,
};
