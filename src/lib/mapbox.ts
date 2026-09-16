/**
 * Mapbox configuration and shared map utilities.
 * Token is read from VITE_MAPBOX_PUBLIC_TOKEN (set in .env).
 * This is a public/publishable token — safe to ship to the browser.
 */

export const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string) || '';

if (!MAPBOX_TOKEN) {
  console.error(
    '[SideQuests] VITE_MAPBOX_PUBLIC_TOKEN is not set — the map will not render.\n' +
    '  • Local dev:   add it to your .env file\n' +
    '  • Vercel:      Project Settings → Environment Variables, then redeploy\n' +
    '  Docs: https://account.mapbox.com/access-tokens/'
  );
}

/**
 * Marker colours. The map deliberately uses two brand colours, not one per
 * category: Midnight Navy for every quest and Ocean Blue for the selected one.
 * Category is carried by the glyph and the popup label instead, which keeps the
 * map restrained and never leans on colour alone to convey meaning.
 */
export const MARKER_COLORS = {
  /** Midnight Navy — the resting state of every quest pin. */
  base: '#0D1321',
  /** Ocean Blue — the interactive colour, for the selected pin. */
  selected: '#2563EB',
  /** Warm Sand — the outline that holds the pin off the map tiles. */
  outline: '#F2E8D5',
  /** Reward Gold — reserved for the glyph, so a pin reads as worth opening. */
  glyph: '#F2B94B',
} as const;

/**
 * Category → glyph, as lucide outline geometry (24×24) matching the icons the
 * rest of the app renders through lucide-react. Markers are built as raw DOM
 * for Mapbox, so the paths live here rather than as React components.
 */
const CATEGORY_GLYPHS: Record<string, string> = {
  Foodie:
    '<path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/>',
  Nightlife: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  Wellness:
    '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
  Culture:
    '<circle cx="13.5" cy="6.5" r=".6" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".6" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".6" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".6" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
  Outdoor:
    '<path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"/><path d="M7 16v6"/><path d="M13 19v3"/><path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5"/>',
  Community:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  'Hidden Gems': '<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
};

/** Fallback glyph: the map pin, for a category we don't have artwork for yet. */
const DEFAULT_GLYPH =
  '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>';

export function getCategoryGlyph(category: string): string {
  return CATEGORY_GLYPHS[category] ?? DEFAULT_GLYPH;
}

/**
 * The marker itself: the sidequests doorway. A rounded arch that tapers to a
 * point at the anchor, so a quest on the map reads as somewhere you can walk
 * into — the same "what's behind that door?" idea as the logo.
 */
export function buildMarkerSvg(category: string, selected = false): string {
  const fill = selected ? MARKER_COLORS.selected : MARKER_COLORS.base;
  return [
    '<svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">',
    `<path d="M2 20a18 18 0 0 1 36 0v22H26l-6 8-6-8H2Z" fill="${fill}" stroke="${MARKER_COLORS.outline}" stroke-width="2.5" stroke-linejoin="round"/>`,
    `<g transform="translate(11 12) scale(0.75)" fill="none" stroke="${MARKER_COLORS.glyph}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" color="${MARKER_COLORS.glyph}">`,
    getCategoryGlyph(category),
    '</g></svg>',
  ].join('');
}

/**
 * Haversine formula — returns a human-readable distance string in miles.
 * Never stores or transmits the coordinates; used purely for display.
 * Future analytics hook: add consent-gated tracking here if needed.
 */
export function calcDistance(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): string {
  const R = 3959; // Earth radius in miles
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  if (dist < 0.05) return 'right here';
  if (dist < 0.15) return 'steps away';
  return `${dist.toFixed(1)} mi`;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
