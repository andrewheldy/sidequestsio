// Mirrors the safe QuestCard DTO returned by discover_nearby / get_quest_card
// (docs/product/LOCATION_DISCOVERY.md §5). It deliberately has no
// verification secrets, codes, or private fields.
export type QuestCategory = 'art' | 'food' | 'outdoors' | 'culture' | 'nightlife' | 'shopping' | 'fitness' | 'hidden_gem';

export type Availability = { state: 'open' | 'closed' | 'unknown'; closesAt: string | null };

export type QuestCard = {
  id: string;
  title: string;
  description: string;
  category: QuestCategory;
  difficulty: string;
  xpReward: number;
  pointsReward: number;
  imageUrl: string | null;
  venueId: string | null;
  venueName: string | null;
  locationLabel: string | null;
  latitude: number;
  longitude: number;
  /** Straight-line distance from the query origin, rounded; null when there is no origin. */
  distanceM: number | null;
  estimatedMinutes: number | null;
  verificationType: string;
  accessNotes: string | null;
  isSponsored: boolean;
  startsAt: string | null;
  endsAt: string | null;
  availability: Availability;
  reasons: string[];
  score: number | null;
};

/** Where results are anchored. Only `device` is the person's real position. */
export type DiscoveryOrigin =
  | { source: 'device'; latitude: number; longitude: number }
  | { source: 'area'; areaId: string }
  | { source: 'map'; latitude: number; longitude: number };

export type DiscoveryFilters = { radiusKm: number; categories: QuestCategory[]; maxMinutes: number | null };

export type DiscoverResponse = {
  serverTime: string;
  origin: { source: DiscoveryOrigin['source']; areaId: string | null; label: string | null };
  items: QuestCard[];
  nextCursor: string | null;
};

export type QuestState = 'available' | 'completed' | 'cooldown' | 'inactive' | 'expired' | 'not_found';
export type QuestCardResponse = { serverTime: string; state: QuestState; quest: QuestCard | null };
