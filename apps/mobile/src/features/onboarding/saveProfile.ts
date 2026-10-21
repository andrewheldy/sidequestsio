import { requireSupabase } from '../../lib/supabase';
import { EXPLORER_STYLES, type OnboardingSelections } from './data';

/**
 * Persists onboarding to the caller's own profiles row (RLS limits it to
 * auth.uid()). Only the five onboarding columns are written. The website's
 * starter xp/level/streak are intentionally NOT written: progression comes from
 * server-side quest completion. `onboarding_completed` flips only because this
 * call succeeded; any failure throws and the caller keeps the draft.
 */
export async function saveOnboardingProfile(userId: string, selections: OnboardingSelections): Promise<void> {
  const energy = EXPLORER_STYLES.find((s) => s.id === selections.explorerStyle)?.energy ?? null;
  const { error } = await requireSupabase()
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        interests: selections.vibes,
        quest_style: selections.explorerStyle,
        quest_energy: energy,
        starting_area: selections.neighborhood,
        onboarding_completed: true,
      },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
}
