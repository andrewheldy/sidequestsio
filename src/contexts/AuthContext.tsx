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
  phone_number: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  x_url: string | null;
  youtube_url: string | null;
  snapchat_url: string | null;
  is_profile_public: boolean;
  show_social_links: boolean;
  show_completed_quests: boolean;
  show_breadcrumbs: boolean;
  // Optional stats written by background jobs — absent until real data exists.
  points_balance_cache?: number | null;
  completed_quests_count?: number | null;
  community_notes_count?: number | null;
  lifetime_points?: number | null;
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
    | 'phone_number'
    | 'instagram_url'
    | 'tiktok_url'
    | 'x_url'
    | 'youtube_url'
    | 'snapchat_url'
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
  /** True when the user is signed in. Alias for `!!user`. */
  isAuthenticated: boolean;
  /** Basic role derived from user metadata; defaults to 'user'. */
  role: 'user' | 'partner' | 'admin';
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  /** Alias for refreshProfile — kept for compatibility with MVP pages. */
  refresh: () => Promise<void>;
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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (!error && data) {
      setProfile(data as Profile);
    } else {
      setProfile(null);
    }
  }, []);

  // Bootstrap session + subscribe to auth state changes.
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        fetchProfile(data.session.user.id).finally(() => active && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // Defer the Supabase call to avoid deadlocks inside the callback.
        setTimeout(() => fetchProfile(newSession.user.id), 0);
      } else {
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

  const role = (user?.user_metadata?.role as 'partner' | 'admin' | undefined) ?? 'user';

  const value: AuthContextValue = {
    isConfigured: isSupabaseConfigured,
    loading,
    isAuthenticated: !!user,
    role,
    user,
    session,
    profile,
    signUp,
    signIn,
    signOut,
    refresh: refreshProfile,
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
