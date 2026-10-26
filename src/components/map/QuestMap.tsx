/**
 * QuestMap — interactive Mapbox map for quest discovery.
 *
 * Designed for mobile-first use:
 *   • Markers are ≥44×44px touch targets shaped as the sidequests doorway
 *   • Pins that would overlap on screen merge into a count bubble; tapping it
 *     zooms in until they separate, so no pin is ever hidden under another
 *   • Location is requested only on explicit user tap (never on mount)
 *   • Selected quest appears as a slide-up bottom sheet overlay
 *   • Map CSS is imported here so it only loads with this lazy chunk
 */
import 'mapbox-gl/dist/mapbox-gl.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Map as MapIcon, MapPin } from 'lucide-react';
import { MAPBOX_TOKEN, buildClusterSvg, buildMarkerSvg } from '@/lib/mapbox';
import { clusterByPixel } from '@/lib/clusterPins';
import type { Quest } from '@/lib/quests';
import QuestMapPopup from './QuestMapPopup';
import UserLocationButton from './UserLocationButton';
import { useToast } from '@/hooks/use-toast';

// Set token at module scope — runs once when the chunk is first loaded.
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN;

/** Pins closer than this on screen merge into a cluster (one pin width). */
const CLUSTER_RADIUS_PX = 44;
/** Tapping a cluster zooms in no further than this. */
const CLUSTER_MAX_ZOOM = 17;

export interface QuestMapProps {
  quests: Quest[];
  /** CSS height value, e.g. "420px" or "calc(100svh - 200px)". */
  height?: string;
  /** [lng, lat] initial center. Defaults to Miami Brickell. */
  initialCenter?: [number, number];
  initialZoom?: number;
}

const QuestMap = ({
  quests,
  height = '380px',
  initialCenter = [-80.1918, 25.7617],
  initialZoom = 12,
}: QuestMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  /** questId → marker element, so selection can repaint just that pin. */
  const markerElsRef = useRef<Map<string, HTMLElement>>(new Map());
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  /** Current selection for marker rebuilds inside map event handlers. */
  const selectedRef = useRef<Quest | null>(null);
  selectedRef.current = selectedQuest;
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const { toast } = useToast();

  // ── Map lifecycle ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return;

    let errorFired = false;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: initialCenter,
      zoom: initialZoom,
      accessToken: MAPBOX_TOKEN,
      attributionControl: false,
      dragRotate: false,
      touchPitch: false,
    });

    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      'bottom-left',
    );

    map.on('load', () => {
      mapRef.current = map;
      setMapReady(true);
    });

    // Catch auth errors (revoked token, domain allowlist mismatch, etc.)
    map.on('error', (e) => {
      const mapError = e.error as (Error & { status?: number }) | undefined;
      const status = mapError?.status;
      const msg = mapError?.message ?? '';
      const lower = msg.toLowerCase();
      const isAuth =
        status === 401 || status === 403 ||
        lower.includes('unauthorized') ||
        lower.includes('forbidden') ||
        lower.includes('not allowed');

      if (!isAuth) {
        // Non-fatal (tile fetch hiccups, style warnings) — log for diagnosis
        // but keep the map alive.
        console.error('[SideQuests] Mapbox error:', e.error);
        return;
      }
      if (errorFired) return;
      errorFired = true;
      console.error('[SideQuests] Mapbox auth error:', e.error);
      // Destroy the map before triggering a re-render so the container div
      // removal doesn't leave a zombie Mapbox instance trying to access a
      // detached DOM node.
      map.remove();
      mapRef.current = null;
      setMapReady(false);
      // 401 = token invalid/revoked; 403 = token valid but this domain is
      // blocked by its Allowed URLs list.
      setMapError(status === 401 ? 'invalid-token' : 'domain-restriction');
    });

    return () => {
      // Skip remove() if the error handler already destroyed the map.
      if (!errorFired) map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Quest markers ──────────────────────────────────────────────────────────
  // Pins closer than one pin-width on screen merge into a count bubble, so no
  // pin hides under another; tapping a bubble zooms in until they separate.
  // Grouping is in screen space, so it is recomputed after every zoom (a pan
  // does not change pin spacing).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Mapbox positions a marker by writing `transform: translate(...)` on its
    // root element every frame, so the root must carry no transform or
    // transition of its own (a transition made pins lag and drift while the
    // map moved; a press scale replaced the translate and threw the pin to
    // the corner). The press effect lives on an inner element instead.
    const markerShell = (label: string, svg: string, size: { w: number; h: number }) => {
      const el = document.createElement('button');
      el.setAttribute('type', 'button');
      el.setAttribute('aria-label', label);
      // Inline styles keep the element self-contained and avoid CSS class conflicts.
      // The box stays a 44px touch target while the artwork sits inside it.
      el.style.cssText = [
        `width:${size.w}px`,
        `height:${size.h}px`,
        'padding:0',
        'border:none',
        'background:transparent',
        'cursor:pointer',
        'touch-action:manipulation',
        '-webkit-tap-highlight-color:transparent',
        'outline:none',
      ].join(';');
      const art = document.createElement('span');
      art.style.cssText = [
        'display:flex',
        'width:100%',
        'height:100%',
        'align-items:center',
        'justify-content:center',
        'filter:drop-shadow(0 3px 8px rgba(13,19,33,0.45))',
        'transition:transform 0.15s ease',
        'transform-origin:50% 100%',
        'pointer-events:none',
      ].join(';');
      art.innerHTML = svg;
      el.appendChild(art);
      const press = (scale: number) => () => {
        art.style.transform = `scale(${scale})`;
      };
      el.addEventListener('pointerdown', press(0.9));
      el.addEventListener('pointerup', press(1));
      el.addEventListener('pointerleave', press(1));
      el.addEventListener('pointercancel', press(1));
      return el;
    };

    const selectQuest = (quest: Quest) => {
      setSelectedQuest(quest);
      map.flyTo({
        center: [quest.lng, quest.lat],
        zoom: Math.max(map.getZoom(), 14),
        duration: 500,
        // Offset up so the popup doesn't cover the marker
        offset: [0, -60],
      });
    };

    const addPin = (quest: Quest) => {
      const selected = quest.id === selectedRef.current?.id;
      const el = markerShell(quest.title, buildMarkerSvg(quest.category, selected), { w: 44, h: 54 });
      el.setAttribute('aria-pressed', String(selected));
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        selectQuest(quest);
      });
      markersRef.current.push(
        new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([quest.lng, quest.lat]).addTo(map),
      );
      markerElsRef.current.set(quest.id, el);
    };

    const addCluster = (group: Quest[]) => {
      const el = markerShell(`${group.length} quests here — zoom in`, buildClusterSvg(group.length), { w: 44, h: 44 });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        // Pins this close even at street level: open the first quest instead.
        if (map.getZoom() >= CLUSTER_MAX_ZOOM - 0.1) {
          selectQuest(group[0]);
          return;
        }
        const bounds = new mapboxgl.LngLatBounds();
        group.forEach((q) => bounds.extend([q.lng, q.lat]));
        map.fitBounds(bounds, { padding: 80, maxZoom: CLUSTER_MAX_ZOOM, duration: 600 });
      });
      const lng = group.reduce((sum, q) => sum + q.lng, 0) / group.length;
      const lat = group.reduce((sum, q) => sum + q.lat, 0) / group.length;
      markersRef.current.push(
        new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(map),
      );
    };

    const render = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      markerElsRef.current.clear();
      const points = quests.map((quest) => {
        const { x, y } = map.project([quest.lng, quest.lat]);
        return { quest, x, y };
      });
      for (const group of clusterByPixel(points, CLUSTER_RADIUS_PX)) {
        if (group.length === 1) addPin(group[0].quest);
        else addCluster(group.map((g) => g.quest));
      }
    };

    render();
    map.on('zoomend', render);

    // Fit the viewport to show all quest pins
    if (quests.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      quests.forEach((q) => bounds.extend([q.lng, q.lat]));
      map.fitBounds(bounds, { padding: 72, maxZoom: 14, duration: 900 });
    } else if (quests.length === 1) {
      map.flyTo({ center: [quests[0].lng, quests[0].lat], zoom: 14, duration: 800 });
    }

    return () => {
      map.off('zoomend', render);
    };
  }, [quests, mapReady]);

  // ── Selected marker ────────────────────────────────────────────────────────
  useEffect(() => {
    markerElsRef.current.forEach((el, questId) => {
      const quest = quests.find((q) => q.id === questId);
      if (!quest) return;
      const art = el.firstElementChild as HTMLElement | null;
      if (art) art.innerHTML = buildMarkerSvg(quest.category, quest.id === selectedQuest?.id);
      el.setAttribute('aria-pressed', String(quest.id === selectedQuest?.id));
    });
  }, [selectedQuest, quests, mapReady]);

  // ── User location dot ──────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    userMarkerRef.current?.remove();
    userMarkerRef.current = null;

    if (!userCoords) return;

    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = [
      'width:14px',
      'height:14px',
      'border-radius:50%',
      'background:#2563EB',
      'border:3px solid #F2E8D5',
      'box-shadow:0 0 0 5px rgba(37,99,235,0.22)',
    ].join(';');

    userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([userCoords.lng, userCoords.lat])
      .addTo(map);
  }, [userCoords, mapReady]);

  // ── Callbacks ──────────────────────────────────────────────────────────────
  const handleLocation = useCallback((coords: { lat: number; lng: number }) => {
    setUserCoords(coords);
    mapRef.current?.flyTo({
      center: [coords.lng, coords.lat],
      zoom: 13,
      duration: 1200,
    });
  }, []);

  const handleLocationError = useCallback(
    (message: string) => {
      toast({ title: 'Location unavailable', description: message });
    },
    [toast],
  );

  // ── Token / auth error fallbacks ───────────────────────────────────────────
  if (!MAPBOX_TOKEN || mapError) {
    const isAuthError = Boolean(mapError);
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border text-center text-sm"
        style={{
          height,
          background: 'hsl(var(--card))',
          borderColor: isAuthError ? 'hsl(var(--reward) / 0.5)' : 'hsl(var(--border))',
        }}
      >
        <span className="text-muted-foreground" aria-hidden="true">
          {isAuthError ? <MapIcon className="h-7 w-7" /> : <MapPin className="h-7 w-7" />}
        </span>
        <div className="px-6 space-y-2 max-w-xs">
          <p className="font-semibold text-foreground">
            {mapError === 'invalid-token'
              ? 'Mapbox token invalid or revoked'
              : isAuthError
                ? 'Mapbox token domain restriction'
                : 'Map token not configured'}
          </p>
          {mapError === 'invalid-token' ? (
            <div className="text-xs text-muted-foreground leading-relaxed space-y-2 text-left">
              <p>
                Mapbox rejected this build&apos;s token (401). It was likely rotated or
                deleted after this deployment was built.
              </p>
              <p>
                Update <span className="font-mono">VITE_MAPBOX_PUBLIC_TOKEN</span> in Vercel
                with a current token from{' '}
                <span className="font-mono text-foreground/70">account.mapbox.com/access-tokens</span>,
                then redeploy — tokens are baked in at build time.
              </p>
            </div>
          ) : isAuthError ? (
            <div className="text-xs text-muted-foreground leading-relaxed space-y-2 text-left">
              <p>Your Mapbox token does not allow requests from this domain.</p>
              <p>
                Go to{' '}
                <span className="font-mono text-foreground/70">account.mapbox.com/access-tokens</span>
                {' '}→ edit your token → add the following to <strong>Allowed URLs</strong>:
              </p>
              <ul className="font-mono text-[10px] space-y-0.5 pl-2">
                <li>https://miamisidequests.io/*</li>
                <li>https://*.vercel.app/*</li>
                <li>http://localhost:*</li>
              </ul>
              <p className="text-muted-foreground/70">
                Or clear the Allowed URLs list entirely to allow all origins during development.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Set <span className="font-mono">VITE_MAPBOX_PUBLIC_TOKEN</span> in your environment.
              In Vercel: Project Settings → Environment Variables, then redeploy.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ height }}>
      {/* Mapbox canvas. mapbox-gl.css sets .mapboxgl-map { position: relative },
          overriding `absolute`, so inset-0 alone collapses it to 0 px tall and
          the canvas and markers are clipped. h-full/w-full size it either way. */}
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      {/* Location button — top right, clear of attribution */}
      <div className="absolute right-3 top-3 z-10">
        <UserLocationButton
          onLocation={handleLocation}
          onError={handleLocationError}
        />
      </div>

      {/* Quest preview — slide-up bottom sheet */}
      {selectedQuest && (
        <QuestMapPopup
          quest={selectedQuest}
          userCoords={userCoords}
          onClose={() => setSelectedQuest(null)}
        />
      )}
    </div>
  );
};

export default QuestMap;
