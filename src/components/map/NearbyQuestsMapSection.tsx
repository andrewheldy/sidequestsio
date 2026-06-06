import { lazy, Suspense } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import MapSkeleton from './MapSkeleton';
import type { Quest } from '@/lib/quests';
import type { QuestMapProps } from './QuestMap';

// Lazy-loaded so Mapbox GL doesn't affect the initial page bundle.
const QuestMap = lazy(() => import('./QuestMap'));

interface NearbyQuestsMapSectionProps
  extends Omit<QuestMapProps, 'quests'> {
  quests: Quest[];
  title?: string;
  subtitle?: string;
  className?: string;
}

/**
 * Drop-in section that wraps QuestMap with header, skeleton, and empty state.
 * Used on /quests (quest discovery) and after QR completion ("What's Next?").
 */
const NearbyQuestsMapSection = ({
  quests,
  title,
  subtitle,
  height = '380px',
  className,
  ...mapProps
}: NearbyQuestsMapSectionProps) => {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || subtitle) && (
        <div>
          {title && <h3 className="font-poppins text-xl font-bold">{title}</h3>}
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}

      {quests.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-card/50 text-muted-foreground"
          style={{ height }}
        >
          <MapPin className="h-8 w-8 opacity-30" />
          <p className="text-sm">No quests in this area yet.</p>
        </div>
      ) : (
        <Suspense fallback={<MapSkeleton height={height} />}>
          <QuestMap quests={quests} height={height} {...mapProps} />
        </Suspense>
      )}
    </div>
  );
};

export default NearbyQuestsMapSection;
