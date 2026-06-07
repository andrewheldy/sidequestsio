import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { isDemoMode } from '@/lib/demo';
import dotlingLogo from '@/assets/dotling-logo.jpg';

type Mode = 'signin' | 'signup';

const Auth = () => {
  const { user, profile, loading, isConfigured, signIn, signUp } = useAuth();
  const location = useLocation();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [mode]);

  // Redirect already-signed-in users away from the auth screen.
  if (!loading && user) {
    if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;
    const dest = (location.state as { from?: string } | null)?.from ?? '/app';
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

    setSubmitting(true);
    const result =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password, displayName.trim() || undefined);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (mode === 'signup') {
      toast({
        title: 'Welcome aboard! 🎉',
        description: isDemoMode
          ? 'Demo account ready — enjoy exploring!'
          : 'Account created. If email confirmation is on, check your inbox — otherwise you can sign in now.',
      });
      if (!isDemoMode) setMode('signin');
    } else {
      toast({ title: 'Signed in', description: 'Welcome back, explorer.' });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo via-indigo-light to-background">
      <div className="absolute -right-32 top-1/4 h-96 w-96 rounded-full bg-coral/20 blur-3xl" />
      <div className="absolute -left-32 bottom-1/4 h-96 w-96 rounded-full bg-turquoise/10 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back home
        </Link>

        <div className="mb-8 flex flex-col items-center text-center">
          <img src={dotlingLogo} alt="SideQuests.io" className="mb-4 h-14 w-14 rounded-xl object-cover" />
          <h1 className="font-poppins text-2xl font-bold">
            <span className="bg-gradient-to-r from-coral via-foreground to-turquoise bg-clip-text text-transparent">
              SideQuests
            </span>
            <span className="text-primary">.io</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your adventure across the city starts here.
          </p>
        </div>

        {isDemoMode ? (
          <div className="mb-6 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-foreground">
            <span className="font-semibold text-amber-700 dark:text-amber-400">Demo Mode</span>
            {' '}— any email and password will work. Your session is stored locally.
          </div>
        ) : !isConfigured ? (
          <div className="mb-6 rounded-xl border border-coral/40 bg-coral/10 p-4 text-sm text-foreground">
            Accounts aren&apos;t connected yet. Add <code className="text-coral">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-coral">VITE_SUPABASE_ANON_KEY</code> to enable sign in.
          </div>
        ) : null}

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
                    className="h-12 pl-10"
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
                  className="h-12 pl-10"
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
                  className="h-12 pl-10"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="h-12 w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to the city?{' '}
          <Link to="/onboarding" className="font-medium text-primary hover:underline">
            Take the tour first
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Auth;
