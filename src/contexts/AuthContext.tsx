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
import { isDemoMode } from '@/lib/demo';
import { useDemoSession } from '@/contexts/DemoSessionContext';

// ---------------------------------------------------------------------------
// Mock user persistence key — stores email + displayName on mock sign-up.
// ---------------------------------------------------------------------------
const MOCK_USER_KEY = 'sq_mock_user';

function getMockUserData(): { email: string; displayName: string } | null {
  try {
    const raw = localStorage.getItem(MOCK_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

// ---------------------------------------------------------------------------
// Demo user/profile builders — read from localStorage so sign-up name sticks.
// ---------------------------------------------------------------------------
const BASE_DEMO_USER_ID = 'demo-user';

function buildDemoUser(): User {
  const mock = getMockUserData();
  return {
    id: BASE_DEMO_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: mock?.email ?? 'demo@sidequests.io',
    email_confirmed_at: '2024-01-01T00:00:00Z',
    phone: '',
    confirmed_at: '2024-01-01T00:00:00Z',
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { display_name: mock?.displayName ?? 'Demo Explorer', role: 'user' },
    identities: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: new Date().toISOString(),
  } as unknown as User;
}

const BASE_DEMO_PROFILE: Profile = {
  user_id: BASE_DEMO_USER_ID,
  display_name: 'Demo Explorer',
  username: 'demo_explorer',
  avatar_url: null,
  home_city: 'Miami, FL',
  bio: 'Exploring Miami one side quest at a time.',
  phone_number: null,
  instagram_url: null,
  tiktok_url: null,
  x_url: null,
  youtube_url: null,
  snapchat_url: null,
  is_profile_public: true,
  show_social_links: true,
  show_completed_quests: true,
  show_breadcrumbs: true,
  points_balance_cache: 1200,
  completed_quests_count: 7,
  community_notes_count: 3,
  lifetime_points: 2500,
  interests: ['Food', 'Culture', 'Nightlife'],
  quest_style: 'adventurer',
  quest_energy: 'high',
  starting_area: 'Wynwood',
  xp: 750,
  level: 5,
  streak: 3,
  onboarding_completed: true,
  created_at: '2024-01-15T00:00:00Z',
};

function buildDemoProfile(): Profile {
  const mock = getMockUserData();
  return { ...BASE_DEMO_PROFILE, display_name: mock?.displayName ?? 'Demo Explorer' };
}

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
  // Must be called before any useCallback that references setDemoSignedIn.
  const { isDemoSignedIn, setSignedIn: setDemoSignedIn } = useDemoSession();
  const demoActive = isDemoMode && isDemoSignedIn;

  // In mock mode we never talk to Supabase, so skip the loading delay entirely.
  const [loading, setLoading] = useState(!isDemoMode);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    if (isDemoMode || !supabase) return;
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

  // Bootstrap session + subscribe to auth state changes (Supabase only).
  useEffect(() => {
    if (isDemoMode || !supabase) {
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

  // ---------------------------------------------------------------------------
  // Auth actions
  // ---------------------------------------------------------------------------

  const signUp = useCallback<AuthContextValue['signUp']>(
    async (email, _password, displayName) => {
      if (isDemoMode) {
        // Persist mock identity so display name/email show across the session.
        localStorage.setItem(
          MOCK_USER_KEY,
          JSON.stringify({ email, displayName: displayName?.trim() || 'Demo Explorer' }),
        );
        setDemoSignedIn(true);
        return { error: null };
      }
      if (!supabase) return { error: NOT_CONFIGURED_MESSAGE };
      const { error } = await supabase.auth.signUp({
        email,
        password: _password,
        options: {
          data: displayName ? { display_name: displayName } : undefined,
          emailRedirectTo: `${window.location.origin}/app`,
        },
      });
      return { error: error?.message ?? null };
    },
    [setDemoSignedIn],
  );

  const signIn = useCallback<AuthContextValue['signIn']>(
    async (_email, _password) => {
      if (isDemoMode) {
        setDemoSignedIn(true);
        return { error: null };
      }
      if (!supabase) return { error: NOT_CONFIGURED_MESSAGE };
      const { error } = await supabase.auth.signInWithPassword({ email: _email, password: _password });
      return { error: error?.message ?? null };
    },
    [setDemoSignedIn],
  );

  const signOut = useCallback(async () => {
    if (isDemoMode) {
      localStorage.removeItem(MOCK_USER_KEY);
      setDemoSignedIn(false);
      return;
    }
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }, [setDemoSignedIn]);

  const refreshProfile = useCallback(async () => {
    if (isDemoMode) return;
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const updateProfile = useCallback<AuthContextValue['updateProfile']>(
    async (patch) => {
      if (isDemoMode) return { error: null };
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
      if (isDemoMode) return { error: null };
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
    // In mock mode the app IS configured (just not for Supabase).
    isConfigured: isDemoMode ? true : isSupabaseConfigured,
    loading: demoActive ? false : loading,
    isAuthenticated: demoActive ? true : !!user,
    role: demoActive ? 'user' : role,
    user: demoActive ? buildDemoUser() : user,
    session: demoActive ? null : session,
    profile: demoActive ? buildDemoProfile() : profile,
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
