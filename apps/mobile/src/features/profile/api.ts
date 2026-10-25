import { requireSupabase } from '../../lib/supabase';
import type { EditableProfileField, PrivacyPreferences, Visibility } from '../../lib/types';

/**
 * Own-account writes for Profile/Settings. Every write is scoped to the signed-in
 * user's id (RLS enforces it too). Consent, onboarding and progression columns are
 * never written to profiles from here.
 */
export const EDITABLE_FIELDS: readonly EditableProfileField[] = [
  'display_name',
  'username',
  'avatar_url',
  'home_city',
  'bio',
  'is_public',
  'show_completed_quests',
];

export type ProfilePatch = Partial<Record<EditableProfileField, string | boolean | null>>;

export const USERNAME_TAKEN = 'That username is already taken.';

function failure(error: unknown, fallback: string): Error {
  const e = error as { code?: string; message?: string } | null;
  if (e?.code === '23505') return new Error(USERNAME_TAKEN);
  return new Error(e?.message || fallback);
}

/** Updates the caller's profiles row. Throws if the write is rejected or touches no row. */
export async function updateOwnProfile(userId: string, patch: ProfilePatch): Promise<void> {
  const safe: Record<string, string | boolean | null> = {};
  for (const field of EDITABLE_FIELDS) if (field in patch) safe[field] = patch[field] as string | boolean | null;
  if (Object.keys(safe).length === 0) return;
  const { data, error } = await requireSupabase()
    .from('profiles')
    .update(safe)
    .eq('user_id', userId)
    .select('user_id')
    .maybeSingle();
  if (error) throw failure(error, 'Your changes could not be saved.');
  if (!data) throw new Error('Your changes could not be saved.');
}

const PRIVACY_COLUMNS = 'user_id, analytics_consent, marketing_consent, location_consent, leaderboard_visibility, profile_visibility';

/** Null when the user has no privacy_preferences row yet (created on first change). */
export async function getPrivacy(userId: string): Promise<PrivacyPreferences | null> {
  const { data, error } = await requireSupabase()
    .from('privacy_preferences')
    .select(PRIVACY_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw failure(error, 'Your privacy settings could not be loaded.');
  return (data as PrivacyPreferences | null) ?? null;
}

export interface PrivacyPatch {
  marketing_consent?: boolean;
  leaderboard_visibility?: Visibility;
}

/** Upserts only the changed columns on the caller's own privacy_preferences row. */
export async function savePrivacy(userId: string, patch: PrivacyPatch): Promise<void> {
  const row: Record<string, unknown> = { user_id: userId };
  if (patch.marketing_consent !== undefined) row.marketing_consent = patch.marketing_consent;
  if (patch.leaderboard_visibility !== undefined) row.leaderboard_visibility = patch.leaderboard_visibility;
  const { error } = await requireSupabase().from('privacy_preferences').upsert(row, { onConflict: 'user_id' });
  if (error) throw failure(error, 'Your privacy settings could not be saved.');
}

/** Appends to the consent log (append-only; insert is the only granted write). */
export async function recordMarketingConsent(userId: string, granted: boolean): Promise<void> {
  const { error } = await requireSupabase()
    .from('consent_events')
    .insert({ user_id: userId, consent_type: 'marketing', granted, source: 'mobile_settings' });
  if (error) throw failure(error, 'Your consent change could not be recorded.');
}
