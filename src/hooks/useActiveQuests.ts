import { useQuery } from '@tanstack/react-query';
import { getRepository } from '@/lib/db';
import { questsWithContextToFlatQuests } from '@/lib/quests/fromDb';
import type { Quest } from '@/lib/quests';

/**
 * Live active quests in the flat `Quest` shape list/map cards render.
 *
 * One shared query key means Explore, Favorites and the public /quests page
 * hit the repository once per session instead of three times. Quests whose
 * venue lacks coordinates are dropped (same rule as the Map tab).
 */
export function useActiveQuests() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['active-quests'],
    queryFn: async () => {
      const repo = await getRepository();
      return repo.listQuests({ status: 'active' });
    },
    retry: 0,
  });

  const quests: Quest[] = data ? questsWithContextToFlatQuests(data) : [];
  return { quests, isLoading, isError };
}
