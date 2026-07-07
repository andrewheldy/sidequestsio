import { lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapSkeleton } from '@/components/map';
import { EmptyState } from '@/components/app/ui';
import { getRepository } from '@/lib/db';
import { questsWithContextToFlatQuests } from '@/lib/quests/fromDb';

// Lazy-loaded so Mapbox GL only enters the bundle when the Map tab is visited.
const QuestMap = lazy(() => import('@/components/map/QuestMap'));

const MAP_HEIGHT = 'clamp(320px, calc(100svh - 195px), 660px)';

/**
 * In-app Map tab — full-height interactive Mapbox quest map.
 * Tap any pin to preview a quest; tap ⊕ to show your location.
 *
 * Pins render live active quests via the repository layer (Supabase in
 * production, the local/mock repository otherwise) — see
 * questsWithContextToFlatQuests for how venue lat/lng becomes the marker
 * position. Quests whose linked venue has no coordinates are dropped rather
 * than shown at (0, 0).
 */
const MapView = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['map-quests'],
    queryFn: async () => {
      const repo = await getRepository();
      return repo.listQuests({ status: 'active' });
    },
    retry: 0,
  });

  const quests = data ? questsWithContextToFlatQuests(data) : [];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-poppins text-2xl font-bold">Quest Map</h1>
        <p className="text-sm text-muted-foreground">
          Tap a pin to preview a quest.
        </p>
      </header>

      {isLoading ? (
        <MapSkeleton height={MAP_HEIGHT} />
      ) : isError ? (
        <EmptyState
          title="Couldn't load the map"
          description="We're having trouble reaching the server. Please try again shortly."
        />
      ) : quests.length === 0 ? (
        <EmptyState
          title="No quests on the map yet"
          description="Active quests need a linked venue with coordinates to appear here."
        />
      ) : (
        <Suspense fallback={<MapSkeleton height={MAP_HEIGHT} />}>
          <QuestMap quests={quests} height={MAP_HEIGHT} />
        </Suspense>
      )}
    </div>
  );
};

export default MapView;
