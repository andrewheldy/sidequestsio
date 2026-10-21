import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, type AppStateStatus } from 'react-native';
import { backend } from './config';
import { secureSessionStorage } from './secureSessionStorage';

/**
 * The single Supabase client. `null` when the backend is missing or refused
 * (see config.ts); callers must handle that rather than inventing data.
 */
export const supabase: SupabaseClient | null =
  backend.status === 'ready'
    ? createClient(backend.url, backend.publishableKey, {
        auth: {
          storage: secureSessionStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          // Email links return ?code=… which only this device can exchange.
          flowType: 'pkce',
        },
      })
    : null;

/** Use inside data-access functions; throws a typed error when unconfigured. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new BackendUnavailableError();
  return supabase;
}

export class BackendUnavailableError extends Error {
  constructor() {
    super(backend.status === 'ready' ? 'Backend unavailable.' : backend.message);
    this.name = 'BackendUnavailableError';
  }
}

// Refresh tokens only while the app is in the foreground (Supabase RN guidance).
if (supabase) {
  const client = supabase;
  AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  });
}
