/**
 * Mission map: the existing Mapbox QuestMap with campaign missions as pins.
 *
 * QuestMap already asks for location only when the visitor taps its locate
 * button, keeps the fix on the device, and clusters overlapping pins. This
 * section adds a mission list (which also works when the map cannot load) and
 * a campaign-styled preview in place of the default quest popup.
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { Navigation, X } from 'lucide-react';
import MapSkeleton from '@/components/map/MapSkeleton';
import { calcDistance } from '@/lib/mapbox';
import { cn } from '@/lib/utils';
import type { Quest } from '@/lib/quests';
import { useCampaign } from './CampaignState';
import { DIFFICULTY_LABEL, Reveal, SectionHead, directionsUrl, statusLabel } from './shared';

// Lazy so Mapbox GL only loads when this section mounts.
const QuestMap = lazy(() => import('@/components/map/QuestMap'));

/** Marker glyphs come from the shared category set. */
const PIN_CATEGORY: Record<string, string> = {
  neon: 'Nightlife',
  canvas: 'Culture',
  calle: 'Culture',
  skyline: 'Outdoor',
};

export function MissionMap() {
  const { campaign, missions, openMission, log } = useCampaign();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const located = useMemo(() => missions.filter((m) => m.mission.lat != null && m.mission.lng != null), [missions]);
  // Depends on the campaign config only, so pins are not rebuilt as statuses change.
  const pins = useMemo<Quest[]>(
    () =>
      campaign.missions
        .filter((m) => m.lat != null && m.lng != null)
        .map((m) => ({
          id: m.id,
          title: m.title,
          neighborhood: m.neighborhood,
          category: PIN_CATEGORY[m.art] ?? 'Hidden Gems',
          reward: '',
          xp: 0,
          distance: '',
          time: m.estimatedTime ?? '',
          image: '',
          x: 50,
          y: 50,
          lat: m.lat!,
          lng: m.lng!,
        })),
    [campaign.missions],
  );

  const select = (id: string | null) => {
    setSelectedId(id);
    if (id) log('map_select', id);
  };

  return (
    <Reveal as="section" id="map" className="vice-section" labelledBy="map-title">
      <SectionHead id="map-title" kicker="The playground" title={<>Miami, <em>mapped.</em></>}>
        <p>
          Pick a mission to see where it sends you. Your location is only requested if you tap the locate button, is
          used on this device to center the map, and is never stored.
        </p>
      </SectionHead>

      <div className="vice-map">
        <div className="vice-map__canvas">
          <Suspense fallback={<MapSkeleton height="100%" />}>
            <QuestMap
              quests={pins}
              height="100%"
              initialCenter={campaign.mapCenter}
              initialZoom={11}
              selectedId={selectedId}
              onSelect={(quest) => select(quest?.id ?? null)}
              renderPopup={(quest, userCoords, onClose) => {
                const item = located.find((m) => m.mission.id === quest.id);
                if (!item) return null;
                return (
                  <div className="vice vice-map__popup" role="group" aria-label={`${item.mission.title} preview`}>
                    <div>
                      <p className="vice-kicker">
                        Mission {item.mission.number} · {DIFFICULTY_LABEL[item.difficulty]}
                      </p>
                      <p className="vice-map__popup-title">{item.mission.title}</p>
                      <p className="vice-map__popup-meta">
                        {item.mission.place}
                        {userCoords && ` · ${calcDistance(userCoords, { lat: quest.lat, lng: quest.lng })}`}
                      </p>
                    </div>
                    <button type="button" className="vice-map__popup-close" aria-label="Close mission preview" onClick={onClose}>
                      <X size={16} aria-hidden="true" />
                    </button>
                    <div className="vice-map__popup-actions">
                      <button type="button" className="vice-btn vice-btn--primary vice-btn--sm" onClick={() => openMission(item.mission.id)}>
                        View mission
                      </button>
                      <a
                        href={directionsUrl(quest.lat, quest.lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="vice-btn vice-btn--ghost vice-btn--sm"
                        onClick={() => log('directions_click', item.mission.id)}
                      >
                        <Navigation size={16} aria-hidden="true" />
                        Directions
                      </a>
                    </div>
                  </div>
                );
              }}
            />
          </Suspense>
        </div>

        <ul className="vice-map__list" aria-label="Mission locations">
          {located.map((item) => {
            const active = item.mission.id === selectedId;
            return (
              <li key={item.mission.id} className={cn('vice-map__item', active && 'is-active')}>
                <button type="button" aria-pressed={active} onClick={() => select(active ? null : item.mission.id)}>
                  <span className="vice-map__num" aria-hidden="true">
                    {item.mission.number}
                  </span>
                  <span>
                    <strong>{item.mission.title}</strong>
                    <small>
                      {item.mission.neighborhood} · {statusLabel(item)}
                    </small>
                  </span>
                </button>
                <a
                  href={directionsUrl(item.mission.lat!, item.mission.lng!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Directions to ${item.mission.title} (opens your maps app)`}
                  onClick={() => log('directions_click', item.mission.id)}
                >
                  <Navigation size={18} aria-hidden="true" />
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </Reveal>
  );
}
