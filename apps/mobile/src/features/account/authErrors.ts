/**
 * Maps Supabase auth failures to a kind + a message safe to show. Never echoes
 * raw server text, tokens or the submitted password.
 */
export type AuthFailureKind =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'rate_limited'
  | 'network'
  | 'weak_password'
  | 'already_registered'
  | 'link_expired'
  | 'unknown';

type AuthErrorLike = { message?: string; code?: string; status?: number; name?: string } | null | undefined;

export function classifyAuthError(error: AuthErrorLike): AuthFailureKind {
  if (!error) return 'unknown';
  const code = (error.code ?? '').toLowerCase();
  const message = (error.message ?? '').toLowerCase();
  if (code === 'invalid_credentials' || /invalid login credentials/.test(message)) return 'invalid_credentials';
  if (code === 'email_not_confirmed' || /email not confirmed/.test(message)) return 'email_not_confirmed';
  if (
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    error.status === 429 ||
    /rate limit|too many requests|security purposes/.test(message)
  ) {
    return 'rate_limited';
  }
  if (code === 'weak_password' || /password should|password is too|weak password/.test(message)) return 'weak_password';
  if (code === 'user_already_exists' || /already registered|already been registered/.test(message)) return 'already_registered';
  if (
    code === 'otp_expired' ||
    code === 'flow_state_expired' ||
    code === 'flow_state_not_found' ||
    /expired|invalid flow state|code verifier|invalid grant/.test(message)
  ) {
    return 'link_expired';
  }
  if (
    error.status === 0 ||
    error.name === 'AuthRetryableFetchError' ||
    /network|failed to fetch|fetch failed|timed out|offline/.test(message)
  ) {
    return 'network';
  }
  return 'unknown';
}

const MESSAGES: Record<AuthFailureKind, string> = {
  invalid_credentials: 'That email and password do not match. Check them and try again.',
  email_not_confirmed: 'Confirm your email first. Check your inbox for the link, or resend it.',
  rate_limited: 'Too many attempts. Please wait a minute and try again.',
  network: 'We could not reach SideQuests. Check your connection and try again.',
  weak_password: 'Choose a stronger password (at least 6 characters, longer is better).',
  already_registered: 'An account with this email may already exist. Try signing in instead.',
  link_expired: 'This link has expired or was already used. Request a new one.',
  unknown: 'Something went wrong. Please try again.',
};

export function authErrorMessage(error: AuthErrorLike): string {
  return MESSAGES[classifyAuthError(error)];
}

export function messageForKind(kind: AuthFailureKind): string {
  return MESSAGES[kind];
}
