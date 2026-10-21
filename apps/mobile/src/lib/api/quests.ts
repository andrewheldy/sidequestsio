import { requireSupabase } from '../supabase';
import type { QuestWithContext } from '../types';

/**
 * Shared quest reads (Explore, Quest Detail, onboarding suggestions).
 * Public data: works for guests through the quests/venues/partners public-read
 * RLS policies + anon grants. Only active quests are listed.
 */
const QUEST_SELECT = '*, partner:partners(id, name, status), venue:venues(*)';

/**
 * Upper bound for one fetch. The curated Miami catalogue is far below this; if
 * a fetch ever returns exactly this many rows, `complete` is false and callers
 * must not present client-side filtering as exhaustive.
 */
export const QUEST_FETCH_LIMIT = 200;

export interface QuestList {
  quests: QuestWithContext[];
  complete: boolean;
}

export async function listActiveQuests(): Promise<QuestList> {
  const { data, error } = await requireSupabase()
    .from('quests')
    .select(QUEST_SELECT)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(QUEST_FETCH_LIMIT);
  if (error) throw error;
  const now = Date.now();
  const quests = ((data ?? []) as QuestWithContext[]).filter(
    (q) => (!q.start_date || Date.parse(q.start_date) <= now) && (!q.end_date || Date.parse(q.end_date) >= now),
  );
  return { quests, complete: (data ?? []).length < QUEST_FETCH_LIMIT };
}

/** Returns null when the quest does not exist or is not visible to the caller. */
export async function getQuest(questId: string): Promise<QuestWithContext | null> {
  const { data, error } = await requireSupabase().from('quests').select(QUEST_SELECT).eq('id', questId).maybeSingle();
  if (error) throw error;
  return (data as QuestWithContext | null) ?? null;
}
