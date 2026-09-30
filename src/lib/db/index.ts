/**
 * Repository selector.
 *
 * Returns the MockRepository in dev builds only (see isDemoMode), the
 * SupabaseRepository when Supabase env vars are configured, otherwise the
 * fully-functional in-browser LocalRepository. Call sites use
 * `await getRepository()` and never care which backend is active.
 */

import type { Repository } from "./repository";
import { LocalRepository } from "./local/LocalRepository";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo";

let instance: Repository | null = null;

export async function getRepository(): Promise<Repository> {
  if (instance) return instance;

  if (isDemoMode) {
    const { MockRepository } = await import("./mock/MockRepository");
    instance = new MockRepository();
    return instance;
  }

  if (supabaseConfigured()) {
    const sb = await getSupabase();
    if (sb) {
      const { SupabaseRepository } = await import("./supabase/SupabaseRepository");
      instance = new SupabaseRepository(sb);
      return instance;
    }
  }

  if (!import.meta.env.DEV) {
    // A deployed build should always talk to Supabase. Falling back here means
    // VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY were missing at build time —
    // the app will show in-browser sample data, not real quests.
    console.error(
      "[SideQuests] Supabase is not configured — falling back to LocalRepository (sample data).\n" +
        "  Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel (Production AND Preview) and redeploy.\n" +
        "  Vite inlines VITE_* vars at build time, so adding them after a build has no effect.",
    );
  }

  instance = new LocalRepository();
  return instance;
}

export function activeBackend(): "supabase" | "local" | "mock" {
  if (isDemoMode) return "mock";
  return supabaseConfigured() ? "supabase" : "local";
}

export type { Repository } from "./repository";
