/**
 * QuestMap — interactive Mapbox map for quest discovery.
 *
 * Designed for mobile-first use:
 *   • Markers are ≥44×44px touch targets with emoji category icons
 *   • Location is requested only on explicit user tap (never on mount)
 *   • Selected quest appears as a slide-up bottom sheet overlay
 *   • Map CSS is imported here so it only loads with this lazy chunk
 */
import 'mapbox-gl/dist/mapbox-gl.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { MAPBOX_TOKEN, getCategoryColor, getCategoryEmoji } from '@/lib/mapbox';
import type { Quest } from '@/lib/quests';
import QuestMapPopup from './QuestMapPopup';
import UserLocationButton from './UserLocationButton';
import { useToast } from '@/hooks/use-toast';

// Set token at module scope — runs once when the chunk is first loaded.
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN;

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
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const { toast } = useToast();

  // ── Map lifecycle ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: false,
      // Disable rotation gestures on mobile for a simpler UX
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

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Quest markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Remove stale markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    quests.forEach((quest) => {
      const color = getCategoryColor(quest.category);
      const emoji = getCategoryEmoji(quest.category);

      const el = document.createElement('button');
      el.setAttribute('type', 'button');
      el.setAttribute('aria-label', quest.title);
      // Inline styles keep the element self-contained and avoid CSS class conflicts
      el.style.cssText = [
        'width:44px',
        'height:44px',
        'border-radius:50%',
        `background:${color}`,
        'border:2.5px solid rgba(255,255,255,0.9)',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'cursor:pointer',
        'font-size:20px',
        'line-height:1',
        'box-shadow:0 3px 10px rgba(0,0,0,0.45)',
        'transition:transform 0.15s ease,box-shadow 0.15s ease',
        'touch-action:manipulation',
        '-webkit-tap-highlight-color:transparent',
        'outline:none',
      ].join(';');
      el.textContent = emoji;

      el.addEventListener('pointerdown', () => {
        el.style.transform = 'scale(0.9)';
      });
      el.addEventListener('pointerup', () => {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = `0 4px 16px ${color}80`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = '0 3px 10px rgba(0,0,0,0.45)';
      });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedQuest(quest);
        map.flyTo({
          center: [quest.lng, quest.lat],
          zoom: Math.max(map.getZoom(), 14),
          duration: 500,
          // Offset up so the popup doesn't cover the marker
          offset: [0, -60],
        });
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([quest.lng, quest.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Fit the viewport to show all quest pins
    if (quests.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      quests.forEach((q) => bounds.extend([q.lng, q.lat]));
      map.fitBounds(bounds, { padding: 72, maxZoom: 14, duration: 900 });
    } else if (quests.length === 1) {
      map.flyTo({ center: [quests[0].lng, quests[0].lat], zoom: 14, duration: 800 });
    }
  }, [quests, mapReady]);

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
      'background:#3B82F6',
      'border:3px solid white',
      'box-shadow:0 0 0 5px rgba(59,130,246,0.25)',
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

  // ── No-token fallback ──────────────────────────────────────────────────────
  if (!MAPBOX_TOKEN) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl bg-card/50 text-center text-sm text-muted-foreground"
        style={{ height }}
      >
        <p className="px-6">
          Map unavailable.
          <br />
          Add <code className="text-xs">VITE_MAPBOX_PUBLIC_TOKEN</code> to your <code className="text-xs">.env</code> file.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ height }}>
      {/* Mapbox canvas */}
      <div ref={containerRef} className="absolute inset-0" />

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
