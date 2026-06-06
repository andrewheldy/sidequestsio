/**
 * Repository selector.
 *
 * Returns the SupabaseRepository when Supabase env vars are configured,
 * otherwise the fully-functional in-browser LocalRepository. Call sites use
 * `await getRepository()` and never care which backend is active.
 */

import type { Repository } from "./repository";
import { LocalRepository } from "./local/LocalRepository";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";

let instance: Repository | null = null;

export async function getRepository(): Promise<Repository> {
  if (instance) return instance;

  if (supabaseConfigured()) {
    const sb = await getSupabase();
    if (sb) {
      const { SupabaseRepository } = await import("./supabase/SupabaseRepository");
      instance = new SupabaseRepository(sb);
      return instance;
    }
  }

  instance = new LocalRepository();
  return instance;
}

export function activeBackend(): "supabase" | "local" {
  return supabaseConfigured() ? "supabase" : "local";
}

export type { Repository } from "./repository";
