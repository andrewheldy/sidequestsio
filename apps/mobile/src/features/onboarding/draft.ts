import { readJson, removeKey, storageKeys, writeJson } from '../../lib/appStorage';
import { EXPLORER_STYLES, NEIGHBORHOODS, TOTAL_STEPS, VIBES, type OnboardingSelections } from './data';

/**
 * Non-secret onboarding draft. Survives navigation, restarts and sign-up.
 *
 * Ownership rules (`ownerUserId`):
 *  - null            a guest draft; the next account to finish onboarding adopts it
 *  - the user's id   that user's own draft
 *  - another id      discarded, never applied (SessionProvider also clears it on switch)
 * A draft is never applied to an account whose onboarding is already complete:
 * completed users never reach this code (the screen forwards them).
 */
export interface OnboardingDraft {
  ownerUserId: string | null;
  step: number;
  selections: OnboardingSelections;
  updatedAt: number;
}

/** Validates stored JSON: unknown ids are dropped so a stale draft cannot inject values. */
export function sanitizeDraft(raw: unknown): OnboardingDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const owner = typeof r.ownerUserId === 'string' ? r.ownerUserId : r.ownerUserId === null ? null : undefined;
  if (owner === undefined) return null;
  const s = (r.selections && typeof r.selections === 'object' ? r.selections : {}) as Record<string, unknown>;
  const vibeIds = new Set(VIBES.map((v) => v.id));
  const vibes = Array.isArray(s.vibes) ? s.vibes.filter((v): v is string => typeof v === 'string' && vibeIds.has(v)) : [];
  const explorerStyle = EXPLORER_STYLES.some((e) => e.id === s.explorerStyle) ? (s.explorerStyle as string) : null;
  const neighborhood = NEIGHBORHOODS.some((n) => n.id === s.neighborhood) ? (s.neighborhood as string) : null;
  const step = typeof r.step === 'number' && Number.isFinite(r.step) ? Math.min(Math.max(Math.round(r.step), 1), TOTAL_STEPS) : 1;
  return {
    ownerUserId: owner,
    step,
    selections: { vibes: [...new Set(vibes)], explorerStyle, neighborhood },
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : 0,
  };
}

/**
 * Loads the draft usable by `userId` (null = guest). A guest draft is adopted
 * by a signed-in user; a draft owned by someone else is deleted.
 */
export async function loadOnboardingDraft(userId: string | null): Promise<OnboardingDraft | null> {
  const draft = sanitizeDraft(await readJson<unknown>(storageKeys.onboardingDraft));
  if (!draft) return null;
  if (draft.ownerUserId === userId) return draft;
  if (draft.ownerUserId === null && userId) return { ...draft, ownerUserId: userId };
  await removeKey(storageKeys.onboardingDraft);
  return null;
}

export async function saveOnboardingDraft(userId: string | null, step: number, selections: OnboardingSelections): Promise<void> {
  const draft: OnboardingDraft = { ownerUserId: userId, step, selections, updatedAt: Date.now() };
  await writeJson(storageKeys.onboardingDraft, draft);
}

export async function clearOnboardingDraft(): Promise<void> {
  await removeKey(storageKeys.onboardingDraft);
}

export function isEmptyDraft(step: number, selections: OnboardingSelections): boolean {
  return step === 1 && selections.vibes.length === 0 && !selections.explorerStyle && !selections.neighborhood;
}
