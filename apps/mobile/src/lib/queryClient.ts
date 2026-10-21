import { QueryClient } from '@tanstack/react-query';

/**
 * Query conventions:
 *  - Every key starts with a domain segment from `queryKeys`.
 *  - Keys for private data include the user id, and the whole cache is cleared
 *    when the signed-in user changes (session/SessionProvider), so one
 *    account's data never renders for another.
 *  - Mutations that award or spend (completion, redemption) are never retried
 *    automatically; the server contract decides what happened.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 60_000, gcTime: 10 * 60_000 },
      mutations: { retry: false },
    },
  });
}

export const queryKeys = {
  quests: {
    all: ['quests'] as const,
    list: () => ['quests', 'list'] as const,
    detail: (questId: string) => ['quests', 'detail', questId] as const,
  },
  account: {
    all: (userId: string) => ['account', userId] as const,
    profile: (userId: string) => ['account', userId, 'profile'] as const,
    progress: (userId: string) => ['account', userId, 'progress'] as const,
    privacy: (userId: string) => ['account', userId, 'privacy'] as const,
    completions: (userId: string) => ['account', userId, 'completions'] as const,
    questStatus: (userId: string, questId: string) => ['account', userId, 'quest', questId] as const,
  },
  rewards: {
    available: () => ['rewards', 'available'] as const,
  },
};
