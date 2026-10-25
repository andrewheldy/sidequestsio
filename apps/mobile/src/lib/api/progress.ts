import { requireSupabase } from '../supabase';
import type { Progress, QuestCompletion } from '../types';

/**
 * Shared, server-maintained progression reads (Profile, Rewards, quest loop).
 * public.user_profiles is written only by SECURITY DEFINER RPCs
 * (complete_quest, redeem_reward) since 0029 (formerly 0023); clients read it, never write it.
 * Invalidate queryKeys.account.progress/completions after a confirmed completion.
 */
const PROGRESS_COLUMNS =
  'user_id, xp, level, points_balance_cache, lifetime_points, completed_quests_count, rewards_redeemed_count';

/** Null when the row is missing (pre-bootstrap accounts): callers show "unavailable", not zeroes. */
export async function getProgress(userId: string): Promise<Progress | null> {
  const { data, error } = await requireSupabase()
    .from('user_profiles')
    .select(PROGRESS_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Progress | null) ?? null;
}

export interface CompletionWithQuest extends QuestCompletion {
  quest: { id: string; title: string; category: string; image_url: string | null } | null;
}

export async function listCompletions(userId: string): Promise<CompletionWithQuest[]> {
  const { data, error } = await requireSupabase()
    .from('quest_completions')
    .select('*, quest:quests(id, title, category, image_url)')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as CompletionWithQuest[];
}
