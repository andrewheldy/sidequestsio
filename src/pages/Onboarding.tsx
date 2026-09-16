import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Gift,
  Loader2,
  MapPin,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from 'lucide-react';
import { CategoryIcon } from '@/components/brand/CategoryIcon';
import { useAuth } from '@/contexts/AuthContext';
import {
  EXPLORER_STYLES,
  NEIGHBORHOODS,
  VIBES,
  buildFirstQuest,
  clearGuestOnboarding,
  emptyOnboarding,
  loadGuestOnboarding,
  saveGuestOnboarding,
  type OnboardingSelections,
} from '@/lib/onboarding';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { LoadingScreen } from '@/components/LoadingScreen';
import { safeNextPath } from '@/lib/navigation';

const TOTAL_STEPS = 6;
const stepAnim = 'animate-in fade-in slide-in-from-bottom-4 duration-500';

const Onboarding = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, profile, loading, completeOnboarding } = useAuth();

  // Auth/guards pass the interrupted destination (e.g. a scanned quest page)
  // via state so the QR → sign-in → onboarding → quest flow isn't dropped.
  const rawNext = safeNextPath((location.state as { next?: string } | null)?.next);
  const nextDest = rawNext && rawNext !== '/onboarding' ? rawNext : '/app';

  const [step, setStep] = useState(1);
  const [selections, setSelections] = useState<OnboardingSelections>(emptyOnboarding);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate any in-progress (guest) selections. If a signed-in user returns
  // mid-flow having already picked a neighborhood, resume at the final step.
  useEffect(() => {
    if (loading) return;
    const saved = loadGuestOnboarding();
    setSelections(saved);
    if (user && saved.neighborhood) setStep(TOTAL_STEPS);
    setHydrated(true);
  }, [loading, user]);

  // Persist selections so guests don't lose progress through account creation.
  useEffect(() => {
    if (hydrated) saveGuestOnboarding(selections);
  }, [selections, hydrated]);

  const firstQuest = useMemo(() => buildFirstQuest(selections), [selections]);

  if (loading || !hydrated) return <LoadingScreen label="Preparing your adventure…" />;

  // Signed-in users who already finished should never see onboarding again.
  if (user && profile?.onboarding_completed) return <Navigate to={nextDest} replace />;

  const toggleVibe = (id: string) =>
    setSelections((s) => ({
      ...s,
      vibes: s.vibes.includes(id) ? s.vibes.filter((v) => v !== id) : [...s.vibes, id],
    }));

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const canAdvance =
    (step === 2 && selections.vibes.length > 0) ||
    (step === 3 && !!selections.explorerStyle) ||
    (step === 4 && !!selections.neighborhood) ||
    step === 1 ||
    step === 5;

  const handleFinish = async () => {
    if (!user) {
      // Conversion moment: selections are already saved to localStorage.
      navigate('/auth', { state: { from: '/onboarding' } });
      return;
    }
    setSaving(true);
    const { error } = await completeOnboarding(selections);
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save', description: error, variant: 'destructive' });
      return;
    }
    clearGuestOnboarding();
    toast({ title: 'You’re all set! 🎉', description: 'Your first quest is waiting.' });
    navigate(nextDest);
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* A single doorway arch instead of the old identity's colour blurs. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-[560px] w-[420px] -translate-x-1/2 rounded-t-full border-x border-t border-navy/8"
      />

      {/* Progress + back */}
      <div className="relative z-10 mx-auto flex w-full max-w-md items-center gap-3 px-6 pt-6">
        {step > 1 ? (
          <button
            onClick={back}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted/40 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <div className="h-9 w-9 flex-shrink-0" />
        )}
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-300',
                i < step ? 'bg-primary' : 'bg-muted/50',
              )}
            />
          ))}
        </div>
        <span className="w-9 flex-shrink-0 text-right text-xs text-muted-foreground">
          {step}/{TOTAL_STEPS}
        </span>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-8 pt-6">
        {/* STEP 1 — Welcome */}
        {step === 1 && (
          <div key="s1" className={cn('flex flex-1 flex-col items-center justify-center text-center', stepAnim)}>
            {/* The doorway, at the moment someone steps through it. */}
            <div className="mb-8 flex h-28 w-24 items-end justify-center rounded-t-[3rem] rounded-b-lg bg-navy pb-5 text-reward">
              <Compass className="h-9 w-9" strokeWidth={1.75} aria-hidden />
            </div>
            <p className="sq-overline mb-3 text-ocean-strong">
              Your Miami field guide
            </p>
            <h1 className="mb-4 font-display text-3xl font-bold leading-tight tracking-[-0.035em] sm:text-4xl">
              The city is full of hidden adventures.
            </h1>
            <p className="mb-10 text-base text-muted-foreground">
              Complete quests. Unlock rewards. Discover places you never knew existed.
            </p>
            <Button size="lg" className="h-12 w-full" onClick={next}>
              Start Exploring
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {/* STEP 2 — Choose your vibe (multi) */}
        {step === 2 && (
          <div key="s2" className={cn('flex flex-1 flex-col', stepAnim)}>
            <StepHeader title="Choose your vibe" subtitle="Pick as many as you like — we’ll tailor your quests." />
            <div className="grid grid-cols-2 gap-3">
              {VIBES.map(({ id, icon: Icon, label }) => {
                const active = selections.vibes.includes(id);
                return (
                  <SelectCard key={id} active={active} onClick={() => toggleVibe(id)}>
                    <Icon
                      className={cn('h-7 w-7', active ? 'text-ocean-strong' : 'text-muted-foreground')}
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span className="font-medium">{label}</span>
                  </SelectCard>
                );
              })}
            </div>
            <FooterCTA disabled={!canAdvance} onClick={next} label="Continue" />
          </div>
        )}

        {/* STEP 3 — Explorer archetype (single) */}
        {step === 3 && (
          <div key="s3" className={cn('flex flex-1 flex-col', stepAnim)}>
            <StepHeader title="What kind of explorer are you?" subtitle="There are no wrong answers. Probably." />
            <div className="flex flex-col gap-3">
              {EXPLORER_STYLES.map(({ id, icon: Icon, label, description }) => {
                const active = selections.explorerStyle === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSelections((prev) => ({ ...prev, explorerStyle: id }))}
                    className={cn(
                      'flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200',
                      active
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card/50 hover:border-primary/50',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'flex h-12 w-10 flex-shrink-0 items-end justify-center rounded-t-[1.25rem] rounded-b-md pb-2.5',
                        active ? 'bg-navy text-reward' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <div className="flex-1">
                      <p className="font-display font-bold tracking-[-0.02em]">{label}</p>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
                        active ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
                      )}
                    >
                      {active && <Check className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <FooterCTA disabled={!canAdvance} onClick={next} label="Continue" />
          </div>
        )}

        {/* STEP 4 — Neighborhood (single) */}
        {step === 4 && (
          <div key="s4" className={cn('flex flex-1 flex-col', stepAnim)}>
            <StepHeader title="Where should we start?" subtitle="Choose your home base in Miami." />
            <div className="grid grid-cols-2 gap-3">
              {NEIGHBORHOODS.map(({ id, icon: Icon, label }) => {
                const active = selections.neighborhood === id;
                return (
                  <SelectCard
                    key={id}
                    active={active}
                    onClick={() => setSelections((prev) => ({ ...prev, neighborhood: id }))}
                  >
                    <Icon
                      className={cn('h-7 w-7', active ? 'text-ocean-strong' : 'text-muted-foreground')}
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span className="text-center text-sm font-medium">{label}</span>
                  </SelectCard>
                );
              })}
            </div>
            <FooterCTA disabled={!canAdvance} onClick={next} label="Build my first quest" />
          </div>
        )}

        {/* STEP 5 — First quest preview */}
        {step === 5 && (
          <div key="s5" className={cn('flex flex-1 flex-col justify-center', stepAnim)}>
            <StepHeader title="Build your first quest" subtitle="Personalized just for you." center />
            <div className="glass-card overflow-hidden">
              <div className="flex items-center justify-between bg-navy p-5 text-sand-soft">
                <CategoryIcon category={firstQuest.category} className="h-9 w-9 text-reward" strokeWidth={1.5} />
                <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sand-soft">
                  {firstQuest.category}
                </span>
              </div>
              <div className="space-y-4 p-5">
                <h2 className="font-display text-xl font-bold tracking-[-0.02em]">{firstQuest.title}</h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <QuestStat icon={<Gift className="h-4 w-4 text-gold-strong" />} label="Reward" value={firstQuest.reward} />
                  <QuestStat icon={<Zap className="h-4 w-4 text-gold-strong" />} label="XP" value={`${firstQuest.xp} XP`} />
                  <QuestStat icon={<MapPin className="h-4 w-4 text-ocean-strong" />} label="Distance" value={firstQuest.distance} />
                  <QuestStat icon={<Star className="h-4 w-4 text-ocean-strong" />} label="Time" value={firstQuest.time} />
                </div>
              </div>
            </div>
            <Button size="lg" className="mt-8 h-12 w-full" onClick={next}>
              Start First Quest
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {/* STEP 6 — Starter profile + account gate */}
        {step === 6 && (
          <div key="s6" className={cn('flex flex-1 flex-col justify-center', stepAnim)}>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-20 w-16 items-end justify-center rounded-t-[2rem] rounded-b-md bg-navy pb-4 text-reward">
                <Compass className="h-7 w-7" aria-hidden />
              </div>
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">Level 1 Explorer</p>
              <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">
                {profile?.display_name || user?.email?.split('@')[0] || 'Your'} adventure begins
              </h2>
            </div>

            <div className="glass-card space-y-5 p-5">
              {/* XP meter */}
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">XP</span>
                  <span className="text-muted-foreground">100 / 250</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/50">
                  <div className="h-full w-2/5 rounded-full bg-ocean" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">First badge unlocked</p>
                  <p className="text-xs text-muted-foreground">City Newcomer</p>
                </div>
                <div className="ml-auto flex items-center gap-1 rounded-full bg-coral/15 px-3 py-1 text-sm text-coral">
                  🔥 1 day streak
                </div>
              </div>

              {selections.vibes.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">Your interests</p>
                  <div className="flex flex-wrap gap-2">
                    {selections.vibes.map((id) => {
                      const v = VIBES.find((x) => x.id === id);
                      if (!v) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1 text-sm"
                        >
                          <v.icon className="h-3.5 w-3.5" aria-hidden />
                          {v.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {!user && (
              <p className="mt-4 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Create a free account to save your progress.
              </p>
            )}

            <Button size="lg" className="mt-6 h-12 w-full" onClick={handleFinish} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : user ? (
                'Begin Adventure'
              ) : (
                'Create account & begin'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---- small presentational helpers ---- */

function StepHeader({
  title,
  subtitle,
  center,
}: {
  title: string;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <div className={cn('mb-6', center && 'text-center')}>
      <h1 className="font-poppins text-2xl font-bold leading-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function SelectCard({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all duration-200',
        active
          ? 'scale-[1.02] border-primary bg-primary/10'
          : 'border-border bg-card/50 hover:border-primary/50 hover:bg-card/80',
      )}
    >
      {active && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" />
        </span>
      )}
      {children}
    </button>
  );
}

function FooterCTA({
  disabled,
  onClick,
  label,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <div className="mt-auto pt-8">
      <Button size="lg" className="h-12 w-full" disabled={disabled} onClick={onClick}>
        {label}
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
}

function QuestStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-muted/30 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

export default Onboarding;
