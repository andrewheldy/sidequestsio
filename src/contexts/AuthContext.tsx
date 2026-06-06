import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { OnboardingSelections } from '@/lib/onboarding';
import { EXPLORER_STYLES } from '@/lib/onboarding';

export interface Profile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  home_city: string;
  bio: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  x_url: string | null;
  is_profile_public: boolean;
  show_social_links: boolean;
  show_completed_quests: boolean;
  show_breadcrumbs: boolean;
  interests: string[];
  quest_style: string | null;
  quest_energy: string | null;
  starting_area: string | null;
  xp: number;
  level: number;
  streak: number;
  onboarding_completed: boolean;
  created_at: string | null;
}

/** Columns the user is allowed to edit on their own profile. */
export type EditableProfile = Partial<
  Pick<
    Profile,
    | 'display_name'
    | 'username'
    | 'avatar_url'
    | 'home_city'
    | 'bio'
    | 'instagram_url'
    | 'tiktok_url'
    | 'x_url'
    | 'is_profile_public'
    | 'show_social_links'
    | 'show_completed_quests'
    | 'show_breadcrumbs'
  >
>;

interface AuthResult {
  error: string | null;
}

interface AuthContextValue {
  isConfigured: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: EditableProfile) => Promise<AuthResult>;
  completeOnboarding: (selections: OnboardingSelections) => Promise<AuthResult>;
}

const NOT_CONFIGURED_MESSAGE =
  'Accounts are not set up yet. Add your Supabase keys to enable sign in.';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return;

    console.log('[SQ:profile] fetchProfile called — userId:', userId);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    console.log('[SQ:profile] query result — data:', data, '| error:', error);

    if (!error && data) {
      console.log('[SQ:profile] success — setting profile');
      setProfile(data as Profile);
      return;
    }

    if (!error && !data) {
      // No profile row yet — the signup trigger may not have fired (e.g. migration
      // not applied in production, or the user pre-dates the trigger). Create a
      // minimal row so the profile page can render.
      console.warn('[SQ:profile] no row found for userId:', userId, '— attempting auto-insert');
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ user_id: userId });

      console.log('[SQ:profile] insert result — error:', insertError);

      // 23505 = unique_violation: the trigger created the row concurrently — fine.
      if (!insertError || insertError.code === '23505') {
        const { data: refetched, error: refetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        console.log('[SQ:profile] refetch after insert — data:', refetched, '| error:', refetchError);
        setProfile((refetched as Profile) ?? null);
      } else {
        console.error('[SQ:profile] could not create profile row', insertError);
        setProfile(null);
      }
      return;
    }

    // Genuine fetch error.
    console.error('[SQ:profile] fetchProfile error:', error);
    setProfile(null);
  }, []);

  // Bootstrap session + subscribe to auth state changes.
  useEffect(() => {
    if (!supabase) {
      console.log('[SQ:auth] Supabase not configured — skipping auth bootstrap');
      setLoading(false);
      return;
    }

    let active = true;
    console.log('[SQ:auth] bootstrap: calling getSession()');

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const userId = data.session?.user?.id ?? null;
      console.log('[SQ:auth] getSession resolved — userId:', userId, '| session:', data.session ? 'present' : 'null');
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        fetchProfile(data.session.user.id).finally(() => {
          console.log('[SQ:auth] getSession path: setLoading(false)');
          if (active) setLoading(false);
        });
      } else {
        console.log('[SQ:auth] no session — setLoading(false)');
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      const userId = newSession?.user?.id ?? null;
      console.log('[SQ:auth] onAuthStateChange — event:', event, '| userId:', userId);
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'SIGNED_OUT') {
        console.log('[SQ:auth] SIGNED_OUT — setProfile(null)');
        setProfile(null);
        return;
      }

      // TOKEN_REFRESHED only updates the session/token — profile data is unchanged.
      if (event === 'TOKEN_REFRESHED') return;

      if (newSession?.user) {
        if (event === 'SIGNED_IN') {
          // Re-enter loading so the redirect in Auth.tsx waits for the profile.
          console.log('[SQ:auth] SIGNED_IN — setLoading(true), deferring fetchProfile');
          setLoading(true);
          setTimeout(() => {
            fetchProfile(newSession.user.id).finally(() => {
              console.log('[SQ:auth] SIGNED_IN path: setLoading(false)');
              setLoading(false);
            });
          }, 0);
        } else {
          // INITIAL_SESSION and other events — loading is managed by getSession() path.
          setTimeout(() => fetchProfile(newSession.user.id), 0);
        }
      } else {
        console.log('[SQ:auth] onAuthStateChange: no user — setProfile(null)');
        setProfile(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = useCallback<AuthContextValue['signUp']>(
    async (email, password, displayName) => {
      if (!supabase) return { error: NOT_CONFIGURED_MESSAGE };
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: displayName ? { display_name: displayName } : undefined,
          emailRedirectTo: `${window.location.origin}/app`,
        },
      });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signIn = useCallback<AuthContextValue['signIn']>(async (email, password) => {
    if (!supabase) return { error: NOT_CONFIGURED_MESSAGE };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const updateProfile = useCallback<AuthContextValue['updateProfile']>(
    async (patch) => {
      if (!supabase) return { error: NOT_CONFIGURED_MESSAGE };
      if (!user) return { error: 'You need to be signed in to update your profile.' };

      const { error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('user_id', user.id);

      if (error) {
        // Unique violation on the username column → friendly message.
        if (error.code === '23505') return { error: 'That username is already taken.' };
        return { error: error.message };
      }
      await fetchProfile(user.id);
      return { error: null };
    },
    [user, fetchProfile],
  );

  const completeOnboarding = useCallback<AuthContextValue['completeOnboarding']>(
    async (selections) => {
      if (!supabase) return { error: NOT_CONFIGURED_MESSAGE };
      if (!user) return { error: 'You need to be signed in to save your adventure.' };

      const energy =
        EXPLORER_STYLES.find((s) => s.id === selections.explorerStyle)?.energy ?? null;

      const { error } = await supabase
        .from('profiles')
        .update({
          interests: selections.vibes,
          quest_style: selections.explorerStyle,
          quest_energy: energy,
          starting_area: selections.neighborhood,
          xp: 100,
          level: 1,
          streak: 1,
          onboarding_completed: true,
        })
        .eq('user_id', user.id);

      if (error) return { error: error.message };
      await fetchProfile(user.id);
      return { error: null };
    },
    [user, fetchProfile],
  );

  const value: AuthContextValue = {
    isConfigured: isSupabaseConfigured,
    loading,
    user,
    session,
    profile,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    updateProfile,
    completeOnboarding,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
