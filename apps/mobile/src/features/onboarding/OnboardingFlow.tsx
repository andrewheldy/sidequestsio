import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, LoadingState, Screen, Text } from '../../components/ui';
import { listActiveQuests } from '../../lib/api/quests';
import { hrefForTarget } from '../../lib/navigation/returnTo';
import { useSession } from '../../session/SessionProvider';
import { colors, radii, spacing } from '../../theme/tokens';
import { ProfileErrorPanel, resolveReturnTarget, usePostAuthRouting } from '../account/postAuth';
import {
  EXPLORER_STYLES,
  NEIGHBORHOODS,
  TOTAL_STEPS,
  VIBES,
  emptySelections,
  type OnboardingSelections,
} from './data';
import { clearOnboardingDraft, isEmptyDraft, loadOnboardingDraft, saveOnboardingDraft } from './draft';
import { saveOnboardingProfile } from './saveProfile';
import { CATEGORY_LABELS, suggestQuests } from './suggest';

/**
 * Welcome -> vibes -> explorer style -> neighbourhood -> first quest -> save.
 * Guests keep a local draft only and can leave at any step; signed-in users
 * with an incomplete profile save to `profiles`. Completed users are forwarded
 * to their destination by usePostAuthRouting.
 */
export function OnboardingFlow({ returnTo }: { returnTo?: string }) {
  const { state } = useSession();
  usePostAuthRouting(returnTo, { onboarding: false });

  switch (state.status) {
    case 'guest':
    case 'unconfigured':
    case 'needs_onboarding':
      return <Steps returnTo={returnTo} />;
    case 'error':
      return (
        <Screen>
          <ProfileErrorPanel message={state.message} />
        </Screen>
      );
    case 'ready':
      return (
        <Screen>
          <LoadingState label="Taking you there…" />
        </Screen>
      );
    default:
      return (
        <Screen>
          <LoadingState label="Preparing your adventure…" />
        </Screen>
      );
  }
}

function Steps({ returnTo }: { returnTo?: string }) {
  const router = useRouter();
  const { userId, refreshProfile } = useSession();
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(1);
  const [selections, setSelections] = useState<OnboardingSelections>(emptySelections);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** Once saved, stop writing the draft so it cannot reappear. */
  const finished = useRef(false);

  // Restore the draft for whoever is here now (guest, or the signed-in account).
  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    void loadOnboardingDraft(userId).then((draft) => {
      if (cancelled) return;
      setStep(draft?.step ?? 1);
      setSelections(draft?.selections ?? emptySelections);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Persist on every change.
  useEffect(() => {
    if (!hydrated || finished.current || isEmptyDraft(step, selections)) return;
    void saveOnboardingDraft(userId, step, selections).catch(() => undefined);
  }, [hydrated, step, selections, userId]);

  const suggestions = useQuery({
    queryKey: ['quests', 'onboarding-suggestions'],
    queryFn: listActiveQuests,
    enabled: hydrated && step >= 5,
    retry: false,
  });

  if (!hydrated) {
    return (
      <Screen>
        <LoadingState label="Preparing your adventure…" />
      </Screen>
    );
  }

  const toggleVibe = (id: string) =>
    setSelections((s) => ({ ...s, vibes: s.vibes.includes(id) ? s.vibes.filter((v) => v !== id) : [...s.vibes, id] }));

  const canContinue =
    step === 1 || step === 5 || (step === 2 && selections.vibes.length > 0) || (step === 3 && !!selections.explorerStyle) || (step === 4 && !!selections.neighborhood);

  async function leave() {
    const target = await resolveReturnTarget(returnTo);
    router.replace(hrefForTarget(target));
  }

  function goToAccount(pathname: '/auth/sign-up' | '/auth/sign-in') {
    router.push({ pathname, params: returnTo ? { returnTo } : {} });
  }

  async function save() {
    if (!userId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveOnboardingProfile(userId, selections);
    } catch {
      // Not saved: the draft stays so the user can retry; onboarding_completed is untouched.
      setSaveError('We could not save your picks. Check your connection and try again.');
      setSaving(false);
      return;
    }
    finished.current = true;
    await clearOnboardingDraft();
    // Reloading the profile flips the session to `ready`; usePostAuthRouting then navigates.
    await refreshProfile();
    setSaving(false);
  }

  const vibeLabels = VIBES.filter((v) => selections.vibes.includes(v.id)).map((v) => v.label);
  const styleLabel = EXPLORER_STYLES.find((s) => s.id === selections.explorerStyle)?.label;
  const areaLabel = NEIGHBORHOODS.find((n) => n.id === selections.neighborhood)?.label;

  return (
    <Screen>
      <View style={styles.header}>
        {step > 1 ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => setStep((s) => s - 1)} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.iconButton} />
        )}
        <View
          style={styles.progress}
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${step} of ${TOTAL_STEPS}`}
          accessibilityValue={{ min: 1, max: TOTAL_STEPS, now: step }}
        >
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={[styles.segment, i < step && styles.segmentOn]} />
          ))}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Skip for now" hitSlop={10} onPress={() => void leave()} style={styles.skip}>
          <Text variant="small" muted>
            Skip
          </Text>
        </Pressable>
      </View>

      {step === 1 ? (
        <View style={styles.body}>
          <Ionicons name="compass-outline" size={56} color={colors.accent} importantForAccessibility="no" accessibilityElementsHidden />
          <Text variant="overline" color={colors.accent}>
            Your Miami field guide
          </Text>
          <Text variant="display" accessibilityRole="header">
            The city is full of hidden adventures.
          </Text>
          <Text muted>Complete quests. Unlock rewards. Discover places you never knew existed.</Text>
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.body}>
          <Header title="Choose your vibe" subtitle="Pick as many as you like — we’ll tailor your quests." />
          <View style={styles.wrap}>
            {VIBES.map((v) => (
              <Chip key={v.id} label={v.label} icon={v.icon} selected={selections.vibes.includes(v.id)} onPress={() => toggleVibe(v.id)} />
            ))}
          </View>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={styles.body}>
          <Header title="What kind of explorer are you?" subtitle="There are no wrong answers. Probably." />
          {EXPLORER_STYLES.map((s) => {
            const active = selections.explorerStyle === s.id;
            return (
              <Pressable
                key={s.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: active, checked: active }}
                accessibilityLabel={`${s.label}. ${s.description}`}
                onPress={() => setSelections((prev) => ({ ...prev, explorerStyle: s.id }))}
                style={[styles.option, active && styles.optionOn]}
              >
                <Ionicons name={s.icon} size={26} color={active ? colors.accent : colors.textMuted} />
                <View style={styles.optionText}>
                  <Text variant="bodyStrong">{s.label}</Text>
                  <Text variant="small" muted>
                    {s.description}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {step === 4 ? (
        <View style={styles.body}>
          <Header title="Where do you want to start?" subtitle="Pick a neighbourhood to begin in." />
          <View style={styles.wrap}>
            {NEIGHBORHOODS.map((n) => (
              <Chip
                key={n.id}
                label={n.label}
                icon={n.icon}
                selected={selections.neighborhood === n.id}
                onPress={() => setSelections((prev) => ({ ...prev, neighborhood: n.id }))}
              />
            ))}
          </View>
        </View>
      ) : null}

      {step === 5 ? (
        <View style={styles.body}>
          <Header title="Quests to start with" subtitle="Real quests that fit what you picked." />
          <Suggestions
            loading={suggestions.isPending}
            failed={suggestions.isError}
            quests={suggestions.data ? suggestQuests(suggestions.data.quests, selections) : []}
            onOpen={(questId) => router.push({ pathname: '/quests/[questId]', params: { questId } })}
            onBrowse={() => void leave()}
          />
        </View>
      ) : null}

      {step === 6 ? (
        <View style={styles.body}>
          <Header
            title={userId ? 'You’re all set.' : 'Save your adventure'}
            subtitle={userId ? 'Save your picks to finish setting up your profile.' : 'Create a free account to keep your picks and your progress.'}
          />
          <Card title="Your picks">
            <Text variant="small">Vibes: {vibeLabels.length ? vibeLabels.join(', ') : 'None yet'}</Text>
            <Text variant="small">Style: {styleLabel ?? 'Not chosen'}</Text>
            <Text variant="small">Starting in: {areaLabel ?? 'Not chosen'}</Text>
          </Card>
          {saveError ? (
            <View style={styles.error} accessibilityLiveRegion="polite">
              <Text variant="small" color={colors.error}>
                {saveError}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.footer}>
        {step < TOTAL_STEPS ? (
          <Button label={step === 1 ? 'Start exploring' : 'Continue'} onPress={() => setStep((s) => s + 1)} disabled={!canContinue} />
        ) : userId ? (
          <Button
            label={saveError ? 'Try again' : 'Save and start exploring'}
            onPress={() => void save()}
            loading={saving}
            disabled={saving}
          />
        ) : (
          <>
            <Button label="Create account to save" onPress={() => goToAccount('/auth/sign-up')} />
            <Button label="I already have an account" variant="secondary" onPress={() => goToAccount('/auth/sign-in')} />
            <Button label="Keep browsing" variant="ghost" onPress={() => void leave()} />
          </>
        )}
      </View>
    </Screen>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      <Text muted>{subtitle}</Text>
    </View>
  );
}

function Suggestions({
  loading,
  failed,
  quests,
  onOpen,
  onBrowse,
}: {
  loading: boolean;
  failed: boolean;
  quests: ReturnType<typeof suggestQuests>;
  onOpen: (questId: string) => void;
  onBrowse: () => void;
}) {
  if (loading) return <LoadingState label="Finding quests…" />;
  if (failed || quests.length === 0) {
    return (
      <Card>
        <Text variant="bodyStrong">No matching quests yet</Text>
        <Text variant="small" muted>
          {failed ? 'We could not load quests right now. You can still finish setting up.' : 'Nothing matches those picks right now. New quests are added regularly.'}
        </Text>
        <Button label="Browse all quests" variant="secondary" onPress={onBrowse} />
      </Card>
    );
  }
  return (
    <View style={{ gap: spacing.sm }}>
      {quests.map((q) => (
        <Pressable
          key={q.id}
          accessibilityRole="button"
          accessibilityLabel={`${q.title}${q.venue?.name ? `, ${q.venue.name}` : ''}`}
          onPress={() => onOpen(q.id)}
          style={styles.questCard}
        >
          <Text variant="bodyStrong">{q.title}</Text>
          {q.venue?.name ? (
            <Text variant="small" muted>
              {q.venue.name}
              {q.venue.neighborhood ? ` · ${q.venue.neighborhood}` : ''}
            </Text>
          ) : null}
          <View style={styles.wrap}>
            <Chip label={CATEGORY_LABELS[q.category] ?? q.category} />
            {q.estimated_time ? <Chip label={q.estimated_time} /> : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  skip: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surface },
  segmentOn: { backgroundColor: colors.accent },
  body: { flex: 1, gap: spacing.md, justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    minHeight: 64,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSubtle,
  },
  optionOn: { borderColor: colors.accent, borderWidth: 2, backgroundColor: colors.surface },
  optionText: { flex: 1, gap: 2 },
  questCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSubtle,
  },
  error: { borderWidth: 1, borderColor: colors.error, borderRadius: radii.md, padding: spacing.sm },
  footer: { gap: spacing.xs },
});
