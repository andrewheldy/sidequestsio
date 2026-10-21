import * as Linking from 'expo-linking';

export type AuthFlow = 'signup' | 'recovery';

/**
 * Deep link the email link returns to (`<scheme>://auth/callback?flow=…`, plus
 * `?code=…` appended by Supabase). Must be allowlisted in the Supabase Auth
 * redirect URLs, otherwise the backend falls back to its Site URL (the website)
 * and confirmation still works in a browser.
 */
export function authRedirectUrl(flow: AuthFlow): string {
  return Linking.createURL('/auth/callback', { queryParams: { flow } });
}
