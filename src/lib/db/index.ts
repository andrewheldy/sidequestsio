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

  instance = new LocalRepository();
  return instance;
}

export function activeBackend(): "supabase" | "local" | "mock" {
  if (isDemoMode) return "mock";
  return supabaseConfigured() ? "supabase" : "local";
}

export type { Repository } from "./repository";
