import { useQuery } from '@tanstack/react-query';
import { backend } from '../../lib/config';
import { queryKeys } from '../../lib/queryClient';
import type { Quest } from '../../lib/types';
import { useSession } from '../../session/SessionProvider';
import { getQuestStatus } from './api';
import { loadPendingScan } from './storage';

/** Key for the stored verified scan of one quest (per user). */
export const pendingScanKey = (userId: string, questId: string) => [...queryKeys.account.questStatus(userId, questId), 'pending'] as const;
/** Key for the server offer (generate_quest_instance) of one quest (per user). */
export const offerKey = (userId: string, questId: string) => [...queryKeys.account.questStatus(userId, questId), 'offer'] as const;

export const questStatusOptions = (userId: string, quest: Pick<Quest, 'id' | 'repeat_cooldown_days'>) => ({
  queryKey: queryKeys.account.questStatus(userId, quest.id),
  queryFn: () => getQuestStatus(userId, quest),
});

export interface QuestCta {
  label: string;
  icon: 'qr-code-outline' | 'checkmark-circle-outline' | 'time-outline' | 'scan-outline';
  /** True when the server says there is nothing to start right now. */
  done: boolean;
  /** Extra line under the button, if any. */
  note: string | null;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Primary-CTA state for a quest from the signed-in user's server status.
 * Guests and any failure to read status fall back to a plain "Start quest":
 * the complete screen and the server re-check everything.
 */
export function useQuestCta(quest: Pick<Quest, 'id' | 'repeat_cooldown_days'>): QuestCta {
  const { state, userId } = useSession();
  const enabled = backend.status === 'ready' && state.status === 'ready' && !!userId;
  const status = useQuery({ ...questStatusOptions(userId ?? '', quest), enabled });
  const pending = useQuery({
    queryKey: pendingScanKey(userId ?? '', quest.id),
    queryFn: () => loadPendingScan(userId as string, quest.id),
    enabled,
    staleTime: 0,
  });

  const start: QuestCta = { label: 'Start quest', icon: 'qr-code-outline', done: false, note: null };
  if (!enabled) return start;
  if (status.data?.kind === 'completed') {
    return { label: 'Completed', icon: 'checkmark-circle-outline', done: true, note: `You completed this quest on ${formatDate(status.data.completedAt)}.` };
  }
  if (status.data?.kind === 'cooldown') {
    // Computed from the device clock, so it never blocks: the server decides when Start is pressed.
    return {
      label: 'Start quest',
      icon: 'qr-code-outline',
      done: false,
      note: `You can repeat this quest from ${formatDate(status.data.availableAt)}.`,
    };
  }
  if (pending.data) {
    return {
      label: 'Continue (verified scan pending)',
      icon: 'scan-outline',
      done: false,
      note: 'Your scan is verified but the quest is not completed yet.',
    };
  }
  return start;
}
