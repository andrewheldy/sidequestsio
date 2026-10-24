import { callRpc } from '../api/rpc';
import type { DiscoverResponse, DiscoveryFilters, DiscoveryOrigin, QuestCardResponse } from './types';

export const PAGE_SIZE = 30;

export function discoverNearby(
  origin: DiscoveryOrigin,
  filters: DiscoveryFilters,
  options: { cursor?: string | null; signal?: AbortSignal; accessToken?: string | null } = {},
) {
  const point = origin.source === 'area' ? null : origin;
  return callRpc<DiscoverResponse>(
    'discover_nearby',
    {
      p_origin_lat: point?.latitude ?? null,
      p_origin_lng: point?.longitude ?? null,
      p_area_id: origin.source === 'area' ? origin.areaId : null,
      p_source: origin.source,
      p_radius_m: Math.round(filters.radiusKm * 1000),
      p_categories: filters.categories.length ? filters.categories : null,
      p_max_minutes: filters.maxMinutes,
      p_limit: PAGE_SIZE,
      p_cursor: options.cursor ?? null,
    },
    { signal: options.signal, accessToken: options.accessToken },
  );
}

export function getQuestCard(questId: string, options: { signal?: AbortSignal; accessToken?: string | null } = {}) {
  return callRpc<QuestCardResponse>('get_quest_card', { p_quest_id: questId }, options);
}

/** Stable key for an origin + filter set, so an older response never replaces a newer query. */
export function queryKey(origin: DiscoveryOrigin, filters: DiscoveryFilters) {
  const place =
    origin.source === 'area' ? origin.areaId : `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}`;
  return [origin.source, place, filters.radiusKm, [...filters.categories].sort().join('+'), filters.maxMinutes ?? 'any'].join('|');
}
