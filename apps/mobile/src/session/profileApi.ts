import type { User } from '@supabase/supabase-js';
import { requireSupabase } from '../lib/supabase';
import type { AccountProfile } from '../lib/types';

export const PROFILE_COLUMNS =
  'user_id, display_name, username, avatar_url, home_city, bio, interests, quest_style, quest_energy, starting_area, onboarding_completed, is_public, show_completed_quests, created_at, terms_version, privacy_version, accepted_terms_at, accepted_privacy_at, marketing_opt_in, marketing_opt_in_at';

/**
 * Loads the signed-in user's profiles row. If it is missing (accounts created
 * before 0010_auth_bootstrap), repairs it with the same values the signup
 * trigger writes — RLS limits this to the caller's own row, and
 * ignoreDuplicates keeps it race-safe against the trigger. Consent columns are
 * never written here: missing consent stays missing rather than fabricated.
 */
export async function fetchOrRepairProfile(user: User): Promise<AccountProfile> {
  const sb = requireSupabase();
  const { data, error } = await sb.from('profiles').select(PROFILE_COLUMNS).eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  if (data) return data as AccountProfile;

  const fallbackName =
    (typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name.trim() : '') ||
    user.email?.split('@')[0] ||
    null;
  const { error: repairError } = await sb
    .from('profiles')
    .upsert({ user_id: user.id, display_name: fallbackName }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (repairError) throw repairError;

  const { data: repaired, error: readError } = await sb
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('user_id', user.id)
    .maybeSingle();
  if (readError) throw readError;
  if (!repaired) throw new Error('Your profile could not be created. Please try again.');
  return repaired as AccountProfile;
}
