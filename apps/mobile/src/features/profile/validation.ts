/** Editable profile text fields and their limits. */
export const profileLimits = { displayName: 50, username: 30, bio: 280, homeCity: 80 } as const;

const USERNAME = /^[A-Za-z0-9_.]{3,30}$/;

/** Trimmed value, or null when empty (the column is cleared). */
export function normalize(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed ? trimmed : null;
}

export function displayNameError(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Enter a display name.';
  return v.length > profileLimits.displayName ? `Use ${profileLimits.displayName} characters or fewer.` : null;
}

export function usernameError(value: string): string | null {
  const v = value.trim();
  if (!v) return null; // optional
  return USERNAME.test(v) ? null : 'Use 3-30 letters, numbers, underscores or periods.';
}

export function bioError(value: string): string | null {
  return value.trim().length > profileLimits.bio ? `Use ${profileLimits.bio} characters or fewer.` : null;
}

export function homeCityError(value: string): string | null {
  return value.trim().length > profileLimits.homeCity ? `Use ${profileLimits.homeCity} characters or fewer.` : null;
}
