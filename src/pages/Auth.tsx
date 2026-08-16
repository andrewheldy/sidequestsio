import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { LoadingScreen } from '@/components/LoadingScreen';
import { safeNextPath } from '@/lib/navigation';
import logoHorizontal from '../../brand/logos/logo-horizontal.svg';
import heroImage from '../../brand/mockups/photography-hero-reference.png';

type Mode = 'signin' | 'signup';

const Auth = () => {
  const { user, profile, loading, profileLoading, isConfigured, signIn, signUp } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [mode]);

  // Redirect already-signed-in users away from the auth screen.
  if (!loading && user) {
    // Don't decide onboarding-vs-destination until the profile is known —
    // right after sign-in there is a moment where it hasn't loaded yet.
    if (!profile && profileLoading) return <LoadingScreen />;

    // QR/deep-link flows arrive as /auth?next=…; in-app guards pass
    // state.from. Both funnel to the same validated destination.
    const dest =
      safeNextPath(searchParams.get('next')) ??
      safeNextPath((location.state as { from?: string } | null)?.from ?? null) ??
      '/app';

    // Missing profile (legacy account) or unfinished onboarding → onboarding,
    // carrying the destination so it isn't lost after the final step.
    if (!profile || !profile.onboarding_completed) {
      return <Navigate to="/onboarding" replace state={{ next: dest }} />;
    }
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signup' && !agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setSubmitting(true);
    const result =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password, displayName.trim() || undefined, {
            marketingOptIn,
          });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (mode === 'signup') {
      toast({
        title: 'Welcome aboard! 🎉',
        description:
          'Account created. If email confirmation is on, check your inbox — otherwise you can sign in now.',
      });
      setMode('signin');
    } else {
      toast({ title: 'Signed in', description: 'Welcome back, explorer.' });
    }
  };

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[0.95fr_1.05fr]">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 py-6 sm:px-8 lg:py-10">
        <Link
          to="/"
          className="mb-10 inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back home
        </Link>

        <div className="mb-8">
          <img src={logoHorizontal} alt="sidequests" className="mb-8 h-auto w-[164px]" />
          <p className="sq-overline mb-3 text-[hsl(var(--ocean-700))]">Your next detour</p>
          <h1 className="font-display text-4xl font-bold leading-none tracking-[-0.05em]">
            {mode === 'signin' ? 'Welcome back.' : 'Make Miami your field guide.'}
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
            {mode === 'signin'
              ? 'Pick up where you left off and find something worth going out for.'
              : 'Save quests, earn XP and Points, and keep an Adventure Log of what you find.'}
          </p>
        </div>

        {!isConfigured && (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">
            Accounts aren&apos;t connected yet. Add <code className="text-coral">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-coral">VITE_SUPABASE_ANON_KEY</code> to enable sign in.
          </div>
        )}

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="w-full">
          <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl bg-muted p-1">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <TabsContent value="signup" className="m-0 space-y-4 data-[state=inactive]:hidden">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="displayName"
                    type="text"
                    autoComplete="name"
                    placeholder="Miami Explorer"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-12 rounded-xl bg-card pl-10 text-base"
                  />
                </div>
              </div>
            </TabsContent>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl bg-card pl-10 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl bg-card pl-10 text-base"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <p className="-mt-2 text-xs leading-relaxed text-muted-foreground">Use at least 6 characters. A longer passphrase is easier to remember and safer.</p>
            )}

            {mode === 'signup' && (
              <div className="space-y-3 pt-1">
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="agreeToTerms"
                    checked={agreedToTerms}
                    onCheckedChange={(v) => setAgreedToTerms(v === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="agreeToTerms" className="text-sm font-normal leading-snug text-muted-foreground">
                    I agree to the{' '}
                    <Link to="/terms" target="_blank" className="text-primary underline underline-offset-2">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" target="_blank" className="text-primary underline underline-offset-2">
                      Privacy Policy
                    </Link>
                    .
                  </Label>
                </div>
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="marketingOptIn"
                    checked={marketingOptIn}
                    onCheckedChange={(v) => setMarketingOptIn(v === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="marketingOptIn" className="text-sm font-normal leading-snug text-muted-foreground">
                    Send me emails about quests, rewards, launches, city updates, events and
                    promotions.
                  </Label>
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="h-12 w-full rounded-xl"
              disabled={submitting || (mode === 'signup' && !agreedToTerms)}
            >
              {submitting ? (
                <>
                <Loader2 className="mr-2 h-4 w-4" />
                  {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : mode === 'signin' ? (
                'Sign in'
              ) : (
                'Create account'
              )}
            </Button>
          </form>
        </Tabs>

        <p className="mt-7 text-center text-sm text-muted-foreground">
          New to the city?{' '}
          <Link to="/onboarding" className="font-medium text-primary hover:underline">
            Take the tour first
          </Link>
        </p>
        <p className="mt-auto pt-10 text-center text-xs text-muted-foreground">By continuing, you agree to explore thoughtfully and respect every place you visit.</p>
      </div>

      <aside className="relative hidden min-h-screen overflow-hidden bg-[hsl(var(--midnight-900))] lg:block" aria-label="sidequests in Miami">
        <img src={heroImage} alt="Two explorers arriving at a Miami neighborhood venue" className="absolute inset-0 h-full w-full object-cover object-[70%_center]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--midnight-950)/0.94)] via-transparent to-black/20" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-14">
          <p className="sq-overline text-[hsl(var(--gold-500))]">A doorway into the unexpected</p>
          <p className="mt-4 max-w-lg font-display text-4xl font-bold leading-tight tracking-[-0.045em]">The city changes when you know what to look for.</p>
        </div>
      </aside>
    </div>
  );
};

export default Auth;
