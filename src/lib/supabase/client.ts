/**
 * Supabase client (optional).
 *
 * The app runs without Supabase by default (LocalRepository). When
 * `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are provided, this returns a
 * configured client and the app switches to the SupabaseRepository.
 *
 * The import of `@supabase/supabase-js` is lazy so bundles/tooling never require
 * the package or credentials to be present.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let attempted = false;

export function supabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  );
}

/**
 * Returns a memoized Supabase client, or null if not configured.
 * Uses a dynamic require via the bundler so the rest of the app is decoupled.
 */
export async function getSupabase(): Promise<SupabaseClient | null> {
  if (client) return client;
  if (attempted && !supabaseConfigured()) return null;
  attempted = true;
  if (!supabaseConfigured()) return null;

  const { createClient } = await import("@supabase/supabase-js");
  client = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );
  return client;
}
