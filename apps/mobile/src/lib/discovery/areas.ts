// Public neighborhood choices for Manual mode. Ids match the discovery_areas
// seed in 0023_location_discovery.sql; the server owns the centroids.
export const DISCOVERY_AREAS = [
  { id: 'wynwood', label: 'Wynwood' },
  { id: 'little-river', label: 'Little River' },
  { id: 'design-district', label: 'Design District' },
  { id: 'midtown', label: 'Midtown' },
  { id: 'downtown', label: 'Downtown' },
  { id: 'brickell', label: 'Brickell' },
  { id: 'little-havana', label: 'Little Havana' },
  { id: 'south-beach', label: 'South Beach' },
  { id: 'coconut-grove', label: 'Coconut Grove' },
] as const;

export const DEFAULT_AREA_ID = 'wynwood';

export function areaLabel(id: string | null) {
  return DISCOVERY_AREAS.find((area) => area.id === id)?.label ?? 'Miami';
}

/** Fallback camera when there are no results to frame. */
export const MIAMI_REGION = { latitude: 25.7907, longitude: -80.2, latitudeDelta: 0.18, longitudeDelta: 0.18 };
