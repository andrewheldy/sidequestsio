import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client setup.
 *
 * The URL and anon key are read from Vite env vars (see `.env.example`).
 * If they are not configured the client is `null` and the app runs in
 * "guest / mock" mode: the marketing site, quest browsing and the guest
 * onboarding flow all keep working, and auth actions surface a friendly
 * message instead of crashing. This keeps the build deploy-safe even before
 * Supabase credentials are added in Vercel.
 *
 * Only the public anon key is used here. The service_role key must NEVER be
 * referenced in client code.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
