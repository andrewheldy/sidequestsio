import { lazy, Suspense } from 'react';
import { MIAMI_QUESTS } from '@/data/miami/toQuest';
import { MapSkeleton } from '@/components/map';

// Lazy-loaded so Mapbox GL only enters the bundle when the Map tab is visited.
const QuestMap = lazy(() => import('@/components/map/QuestMap'));

const MAP_HEIGHT = 'clamp(320px, calc(100svh - 195px), 660px)';

/**
 * In-app Map tab — full-height interactive Mapbox quest map.
 * Tap any pin to preview a quest; tap ⊕ to show your location.
 */
const MapView = () => (
  <div className="space-y-4">
    <header>
      <h1 className="font-poppins text-2xl font-bold">Quest Map</h1>
      <p className="text-sm text-muted-foreground">
        Tap a pin to preview a quest.
      </p>
    </header>

    <Suspense fallback={<MapSkeleton height={MAP_HEIGHT} />}>
      <QuestMap quests={MIAMI_QUESTS} height={MAP_HEIGHT} />
    </Suspense>
  </div>
);

export default MapView;
