import { useCallback, useEffect, useRef, useState } from 'react';
import { getSession } from '../lib/auth/session';
import { discoverNearby, queryKey } from '../lib/discovery/api';
import { diversifyTop } from '../lib/discovery/rerank';
import type { DiscoverResponse, DiscoveryFilters, DiscoveryOrigin, QuestCard } from '../lib/discovery/types';

export type DiscoveryState = {
  items: QuestCard[];
  /** Results belong to this origin label (server-provided for areas). */
  originLabel: string | null;
  initialLoading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
};

const INITIAL: DiscoveryState = {
  items: [],
  originLabel: null,
  initialLoading: true,
  refreshing: false,
  loadingMore: false,
  error: null,
  hasMore: false,
};

/**
 * Nearby results for one origin + filter set. Superseded requests are aborted
 * and their late responses ignored; prior results stay visible while a new
 * query loads.
 */
export function useDiscovery(origin: DiscoveryOrigin | null, filters: DiscoveryFilters) {
  const [state, setState] = useState<DiscoveryState>(INITIAL);
  const activeKey = useRef<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const cursor = useRef<string | null>(null);
  const key = origin ? queryKey(origin, filters) : null;

  const load = useCallback(
    async (mode: 'replace' | 'more') => {
      if (!origin || !key) return;
      if (mode === 'replace') {
        controller.current?.abort();
        cursor.current = null;
      }
      const request = new AbortController();
      controller.current = request;
      activeKey.current = key;
      setState((s) => ({ ...s, error: null, refreshing: mode === 'replace' && !s.initialLoading, loadingMore: mode === 'more' }));

      const session = await getSession();
      const result = await discoverNearby(origin, filters, {
        cursor: mode === 'more' ? cursor.current : null,
        signal: request.signal,
        accessToken: session?.accessToken,
      });
      if (activeKey.current !== key || request.signal.aborted) return;
      if (!result.ok) {
        setState((s) => ({ ...s, initialLoading: false, refreshing: false, loadingMore: false, error: result.error }));
        return;
      }
      const data: DiscoverResponse = result.data;
      if (!data || !Array.isArray(data.items)) {
        setState((s) => ({ ...s, initialLoading: false, refreshing: false, loadingMore: false, error: 'bad_response' }));
        return;
      }
      cursor.current = data.nextCursor;
      setState((s) => ({
        items: mode === 'more' ? [...s.items, ...data.items] : diversifyTop(data.items),
        originLabel: data.origin.label,
        initialLoading: false,
        refreshing: false,
        loadingMore: false,
        error: null,
        hasMore: !!data.nextCursor,
      }));
    },
    // `key` captures origin + filters.
    [key],
  );

  useEffect(() => {
    load('replace');
    return () => controller.current?.abort();
  }, [load]);

  return {
    ...state,
    retry: () => load('replace'),
    loadMore: () => state.hasMore && !state.loadingMore && load('more'),
  };
}
