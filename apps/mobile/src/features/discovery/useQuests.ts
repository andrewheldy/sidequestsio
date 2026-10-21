import { useQuery } from '@tanstack/react-query';
import { getQuest, listActiveQuests } from '../../lib/api/quests';
import { backend } from '../../lib/config';
import { queryKeys } from '../../lib/queryClient';

export function useQuestList() {
  return useQuery({
    queryKey: queryKeys.quests.list(),
    queryFn: listActiveQuests,
    enabled: backend.status === 'ready',
  });
}

export function useQuest(questId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.quests.detail(questId ?? ''),
    queryFn: () => getQuest(questId as string),
    enabled: backend.status === 'ready' && !!questId,
  });
}
