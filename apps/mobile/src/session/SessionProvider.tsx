import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { clearAccountScopedStorage } from '../lib/appStorage';
import { backend } from '../lib/config';
import { supabase } from '../lib/supabase';
import { fetchOrRepairProfile } from './profileApi';
import { sessionOf, stateForProfile, type SessionState } from './sessionState';

interface SessionContextValue {
  state: SessionState;
  /** Signed-in user id, or null for guests/unconfigured/restoring. */
  userId: string | null;
  /** Re-reads the profiles row (after onboarding/profile saves, or to retry an error). */
  refreshProfile: () => Promise<void>;
  /** Ends the session locally and on the server. Clears account-scoped caches and drafts. */
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'Something went wrong loading your profile.';
}

export function SessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SessionState>(() =>
    backend.status === 'ready' ? { status: 'restoring' } : { status: 'unconfigured', message: backend.message },
  );
  const currentUserId = useRef<string | null>(null);
  /** Ignores profile responses that arrive after the user changed. */
  const loadToken = useRef(0);

  const loadProfile = useCallback(async (session: Session) => {
    const token = ++loadToken.current;
    setState({ status: 'loading_profile', session });
    try {
      const profile = await fetchOrRepairProfile(session.user);
      if (token === loadToken.current) setState(stateForProfile(session, profile));
    } catch (error) {
      if (token === loadToken.current) setState({ status: 'error', session, message: errorMessage(error) });
    }
  }, []);

  const applySession = useCallback(
    async (session: Session | null) => {
      const nextUserId = session?.user.id ?? null;
      const previousUserId = currentUserId.current;
      currentUserId.current = nextUserId;

      // Leaving an account (signout, expiry, or switching): drop every cached
      // query and private draft so nothing leaks into the next session. A
      // guest -> account transition keeps the guest's onboarding draft and
      // pending return, which onboarding adopts explicitly.
      if (previousUserId && previousUserId !== nextUserId) {
        queryClient.clear();
        await clearAccountScopedStorage();
      }

      if (!session) {
        loadToken.current += 1;
        setState({ status: 'guest' });
        return;
      }
      if (previousUserId !== nextUserId) {
        await loadProfile(session);
      } else {
        // Token refresh for the same user: keep the loaded profile, update the session.
        setState((prev) => ('profile' in prev ? { ...prev, session } : prev));
      }
    },
    [loadProfile, queryClient],
  );

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) void applySession(data.session);
      })
      .catch(() => {
        if (active) void applySession(null);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer Supabase calls out of the auth callback (avoids a client deadlock).
      setTimeout(() => {
        if (active) void applySession(session);
      }, 0);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [applySession]);

  const refreshProfile = useCallback(async () => {
    const session = sessionOf(state);
    if (session) await loadProfile(session);
  }, [state, loadProfile]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    // Local scope always succeeds offline; the server session is revoked when reachable.
    const { error } = await supabase.auth.signOut();
    if (error) await supabase.auth.signOut({ scope: 'local' });
    await applySession(null);
  }, [applySession]);

  const value = useMemo<SessionContextValue>(
    () => ({ state, userId: sessionOf(state)?.user.id ?? null, refreshProfile, signOut }),
    [state, refreshProfile, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

/** For tests: render screens with a fixed session state. */
export const SessionContextForTests = SessionContext;
