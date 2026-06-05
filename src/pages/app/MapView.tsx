import { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { QUESTS, getQuestById } from '@/lib/quests';
import { cn } from '@/lib/utils';
import AppQuestCard from '@/components/app/AppQuestCard';

/**
 * Lightweight map preview. A full interactive map is a post-MVP addition, so
 * this renders a stylized city canvas with tappable quest pins — no heavy
 * mapping dependency. Selecting a pin reveals the quest below.
 */
const MapView = () => {
  const [selectedId, setSelectedId] = useState<string | null>(QUESTS[0]?.id ?? null);
  const selected = selectedId ? getQuestById(selectedId) : null;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-poppins text-2xl font-bold">Quest Map</h1>
          <p className="text-sm text-muted-foreground">Tap a pin to preview a quest.</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
          <Navigation className="h-3.5 w-3.5 text-primary" /> Miami
        </span>
      </header>

      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-indigo-light via-indigo to-background">
        {/* faux streets */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute left-1/2 top-0 h-full w-10 -translate-x-1/2 bg-turquoise/5" />
        <div className="absolute left-0 top-1/2 h-10 w-full -translate-y-1/2 bg-coral/5" />

        {QUESTS.map((q) => {
          const active = q.id === selectedId;
          return (
            <button
              key={q.id}
              onClick={() => setSelectedId(q.id)}
              aria-label={q.title}
              style={{ left: `${q.x}%`, top: `${q.y}%` }}
              className={cn(
                'absolute -translate-x-1/2 -translate-y-1/2 transition-transform',
                active ? 'z-10 scale-125' : 'hover:scale-110',
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-lg transition-colors',
                  active
                    ? 'border-background bg-primary text-primary-foreground'
                    : 'border-background bg-card text-primary',
                )}
              >
                <MapPin className="h-4 w-4" />
              </span>
              {active && (
                <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium">
                  {q.neighborhood}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">Selected quest</p>
          <AppQuestCard quest={selected} />
        </div>
      )}
    </div>
  );
};

export default MapView;
