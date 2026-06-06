/**
 * AuthContext (Phase 4)
 * ---------------------
 * Provides the current session + profile to the whole app and abstracts the two
 * backends:
 *   - LocalRepository mode: a simulated email "magic link" that signs the user
 *     in immediately (great for development & demos), plus one-tap demo logins.
 *   - Supabase mode: real magic-link / OAuth via supabase-auth.
 *
 * On sign-in it links any pending pre-auth scan context so the user resumes the
 * exact quest they scanned (anonymous → authenticated continuity).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Role, User, UserProfile } from "@/types/db";
import { getRepository, activeBackend } from "@/lib/db";
import { getSupabase } from "@/lib/supabase/client";
import { getAnonymousSessionId } from "@/lib/app/session";
import { track } from "@/lib/analytics/events";

const LOCAL_SESSION_KEY = "sq.session.user_id";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  role: Role;
  loading: boolean;
  isAuthenticated: boolean;
  signInWithEmail: (email: string, displayName?: string) => Promise<void>;
  signInWithProvider: (provider: "google" | "apple") => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async (userId: string | null) => {
    if (!userId) {
      setUser(null);
      setProfile(null);
      return;
    }
    const repo = await getRepository();
    const u = await repo.getUserById(userId);
    setUser(u);
    setProfile(u ? await repo.getProfile(userId) : null);
  }, []);

  const refresh = useCallback(async () => {
    if (user) await loadUser(user.id);
  }, [user, loadUser]);

  // Bootstrap session.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (activeBackend() === "supabase") {
          const sb = await getSupabase();
          const { data } = (await sb?.auth.getSession()) ?? { data: { session: null } };
          const email = data.session?.user?.email ?? null;
          if (email) {
            const repo = await getRepository();
            const u = await repo.getUserByEmail(email);
            if (active) await loadUser(u?.id ?? null);
          }
          sb?.auth.onAuthStateChange(async (_evt, session) => {
            const e = session?.user?.email ?? null;
            if (!e) return loadUser(null);
            const repo = await getRepository();
            const u = await repo.getUserByEmail(e);
            await loadUser(u?.id ?? null);
          });
        } else {
          const id = window.localStorage.getItem(LOCAL_SESSION_KEY);
          if (active) await loadUser(id);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadUser]);

  const finishSignIn = useCallback(
    async (signedIn: User) => {
      window.localStorage.setItem(LOCAL_SESSION_KEY, signedIn.id);
      track("auth_completed", {
        user_id: signedIn.id,
        anonymous_session_id: getAnonymousSessionId(),
      });
      await loadUser(signedIn.id);
    },
    [loadUser],
  );

  const signInWithEmail = useCallback(
    async (email: string, displayName?: string) => {
      track("auth_started", { props: { method: "email" } });
      const repo = await getRepository();
      if (activeBackend() === "supabase") {
        const sb = await getSupabase();
        await sb?.auth.signInWithOtp({ email });
        // The onAuthStateChange handler completes sign-in after the user clicks
        // the magic link; we still upsert the app-side user row.
        await repo.upsertUser({ email, display_name: displayName });
        return;
      }
      // Local mode: simulate magic-link by signing in immediately.
      const u = await repo.upsertUser({ email, display_name: displayName });
      await finishSignIn(u);
    },
    [finishSignIn],
  );

  const signInWithProvider = useCallback(
    async (provider: "google" | "apple") => {
      track("auth_started", { props: { method: provider } });
      if (activeBackend() === "supabase") {
        const sb = await getSupabase();
        await sb?.auth.signInWithOAuth({ provider });
        return;
      }
      // Local mode: simulate an OAuth identity.
      const repo = await getRepository();
      const email = `${provider}-user@sidequests.io`;
      const u = await repo.upsertUser({
        email,
        display_name: provider === "google" ? "Google Quester" : "Apple Quester",
      });
      await finishSignIn(u);
    },
    [finishSignIn],
  );

  const signOut = useCallback(async () => {
    if (activeBackend() === "supabase") {
      const sb = await getSupabase();
      await sb?.auth.signOut();
    }
    window.localStorage.removeItem(LOCAL_SESSION_KEY);
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      role: user?.role ?? "user",
      loading,
      isAuthenticated: !!user,
      signInWithEmail,
      signInWithProvider,
      signOut,
      refresh,
    }),
    [user, profile, loading, signInWithEmail, signInWithProvider, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
