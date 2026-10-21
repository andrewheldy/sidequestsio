export const MIN_PASSWORD_LENGTH = 6;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string): string {
  return value.trim();
}

export function emailError(value: string): string | null {
  const email = normalizeEmail(value);
  if (!email) return 'Enter your email.';
  return EMAIL.test(email) ? null : 'Enter a valid email address.';
}

export function newPasswordError(value: string): string | null {
  if (!value) return 'Enter a password.';
  return value.length < MIN_PASSWORD_LENGTH ? `Use at least ${MIN_PASSWORD_LENGTH} characters.` : null;
}
