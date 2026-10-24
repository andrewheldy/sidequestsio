import { INITIAL_EVENT_GRACE_MS, classifyRegionEvent, planNativeRegions } from '../src/lib/adventure/regions';
import { DEFAULT_ADVENTURE_STATE, type GeofenceBundle } from '../src/lib/storage/deviceStore';

function bundle(regionCount: number): GeofenceBundle {
  const regions = Array.from({ length: regionCount }, (_, i) => ({
    id: `v:${i}`, latitude: 25.8 + i * 0.001, longitude: -80.2, radiusM: 250, questIds: [`q${i}`],
  }));
  return {
    version: 'v1',
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    deliveryEnabled: true,
    coverage: { areaId: 'wynwood', label: 'Wynwood' },
    refreshRegion: { id: 'wynwood', latitude: 25.8, longitude: -80.2, radiusM: 2000, questIds: [] },
    regions,
    candidates: regions.map((r, i) => ({ questId: `q${i}`, regionId: r.id, title: `Quest ${i}`, category: 'art', xpReward: 50, pointsReward: 25, estimatedMinutes: 15, venueId: `${i}` })),
  };
}

describe('planNativeRegions', () => {
  it('never exceeds 15 candidates + 1 refresh region', () => {
    const regions = planNativeRegions(bundle(40));
    expect(regions).toHaveLength(16);
    expect(regions.filter((r) => r.identifier.startsWith('refresh:'))).toHaveLength(1);
    expect(regions.find((r) => r.identifier.startsWith('refresh:'))).toMatchObject({ notifyOnEnter: false, notifyOnExit: true });
  });

  it('deducts regions owned by other features', () => {
    expect(planNativeRegions(bundle(40), 10)).toHaveLength(6);
    expect(planNativeRegions(bundle(40), 16)).toHaveLength(0);
  });

  it('drops invalid regions and regions without a candidate', () => {
    const b = bundle(3);
    b.regions[0].latitude = Number.NaN;
    b.candidates = b.candidates.filter((c) => c.regionId !== 'v:1');
    expect(planNativeRegions(b).map((r) => r.identifier)).toEqual(['v:2', 'refresh:wynwood']);
  });
});

describe('classifyRegionEvent', () => {
  const now = 1_000_000_000;
  const state = { ...DEFAULT_ADVENTURE_STATE, bundle: bundle(2), registeredAt: now };

  it('suppresses the "already inside" report at registration', () => {
    expect(classifyRegionEvent(state, { type: 'enter', regionId: 'v:0' }, now + 5_000)).toMatchObject({ action: 'ignore', reason: 'initial_inside' });
  });

  it('processes a real arrival once, then ignores repeats until an exit', () => {
    const later = now + INITIAL_EVENT_GRACE_MS + 1;
    const first = classifyRegionEvent(state, { type: 'enter', regionId: 'v:0' }, later);
    expect(first.action).toBe('process');
    const repeat = classifyRegionEvent({ ...state, regionState: first.regionState }, { type: 'enter', regionId: 'v:0' }, later + 10);
    expect(repeat).toMatchObject({ action: 'ignore', reason: 'duplicate' });
    const exit = classifyRegionEvent({ ...state, regionState: repeat.regionState }, { type: 'exit', regionId: 'v:0' }, later + 20);
    const again = classifyRegionEvent({ ...state, regionState: exit.regionState }, { type: 'enter', regionId: 'v:0' }, later + 30);
    expect(again.action).toBe('process');
  });

  it('ignores regions not in the current bundle and routes refresh exits', () => {
    expect(classifyRegionEvent(state, { type: 'enter', regionId: 'v:99' }, now + INITIAL_EVENT_GRACE_MS * 2)).toMatchObject({ reason: 'unknown_region' });
    expect(classifyRegionEvent(state, { type: 'exit', regionId: 'refresh:wynwood' }, now).action).toBe('refresh');
  });
});
