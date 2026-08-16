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

/** Category → hex color, aligned to the SideQuests design palette. */
export const CATEGORY_COLORS: Record<string, string> = {
  Foodie: '#F65A44',       // brand coral
  Nightlife: '#8B5CF6',   // purple
  Wellness: '#00CED1',    // brand turquoise
  Culture: '#F59E0B',     // amber
  Outdoor: '#10B981',     // emerald
  Community: '#3B82F6',   // blue
  'Hidden Gems': '#EC4899', // pink
};

/** Category → emoji shown inside marker circles. */
export const CATEGORY_EMOJIS: Record<string, string> = {
  Foodie: '🍽',
  Nightlife: '🌙',
  Wellness: '✨',
  Culture: '🎨',
  Outdoor: '🌿',
  Community: '🤝',
  'Hidden Gems': '💎',
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? '#F65A44';
}

export function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJIS[category] ?? '📍';
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
