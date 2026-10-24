import { CLAIM_BUDGET_MS, nudgeCopy, processGeofenceEvent, type PipelineDeps } from '../src/lib/adventure/pipeline';
import { INITIAL_EVENT_GRACE_MS } from '../src/lib/adventure/regions';
import { DEFAULT_ADVENTURE_STATE, type AdventureState, type DeviceSettings, type GeofenceBundle } from '../src/lib/storage/deviceStore';

const T0 = Date.parse('2026-10-24T15:00:00Z');

const bundle: GeofenceBundle = {
  version: 'v1',
  expiresAt: new Date(T0 + 86_400_000).toISOString(),
  deliveryEnabled: true,
  coverage: { areaId: 'wynwood', label: 'Wynwood' },
  refreshRegion: null,
  regions: [{ id: 'v:a', latitude: 25.8, longitude: -80.2, radiusM: 250, questIds: ['q1'] }],
  candidates: [{ questId: 'q1', regionId: 'v:a', title: 'Mural hunt', category: 'art', xpReward: 50, pointsReward: 25, estimatedMinutes: 15, venueId: 'a' }],
};

function setup(overrides: Partial<PipelineDeps> = {}, statePatch: Partial<AdventureState> = {}) {
  let state: AdventureState = {
    ...DEFAULT_ADVENTURE_STATE,
    gateOpen: true,
    ownerUserId: 'user-1',
    bundle,
    registeredVersion: 'v1',
    registeredAt: T0 - INITIAL_EVENT_GRACE_MS * 10,
    ...statePatch,
  };
  let settings: DeviceSettings = { installationId: 'install-1', desiredMode: 'adventure', adventurePaused: false, selectedAreaId: null, radiusKm: 3 };
  let clock = T0;
  const deps: PipelineDeps = {
    now: () => clock,
    loadState: async () => state,
    saveState: async (patch) => {
      state = { ...state, ...patch };
    },
    loadSettings: async () => settings,
    getSession: async () => ({ userId: 'user-1', accessToken: 'token' }),
    permissionsStillGranted: async () => true,
    isDiscoveryVisible: () => false,
    showInAppSuggestion: jest.fn(),
    claim: jest.fn(async () => ({ ok: true as const, data: { allow: true as const, claimId: 'claim-1', quest: { id: 'q1', title: 'Mural hunt', category: 'art', xpReward: 50, pointsReward: 25 } } })),
    recordResult: jest.fn(async () => undefined),
    schedule: jest.fn(async () => true),
    refreshBundle: jest.fn(async () => undefined),
    policyVersion: 'test',
    ...overrides,
  };
  return {
    deps,
    state: () => state,
    pause: () => {
      settings = { ...settings, adventurePaused: true };
      state = { ...state, gateOpen: false };
    },
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

const enter = { type: 'enter' as const, regionId: 'v:a' };

describe('processGeofenceEvent', () => {
  it('claims, schedules one notification and records the scheduling result', async () => {
    const { deps, state } = setup();
    await expect(processGeofenceEvent(enter, deps)).resolves.toBe('scheduled');
    expect(deps.claim).toHaveBeenCalledWith(
      expect.objectContaining({ p_installation_id: 'install-1', p_quest_id: 'q1', p_region_id: 'v:a', p_catalog_version: 'v1' }),
      { accessToken: 'token', timeoutMs: CLAIM_BUDGET_MS },
    );
    expect(deps.schedule).toHaveBeenCalledWith(expect.objectContaining({ identifier: 'nudge:claim-1', questId: 'q1' }));
    expect(deps.recordResult).toHaveBeenCalledWith('claim-1', 'scheduled', expect.anything());
    expect(state().recentQuests.q1).toBe(T0);
  });

  it('does nothing when the local gate is closed or Adventure is paused', async () => {
    const closed = setup({}, { gateOpen: false });
    await expect(processGeofenceEvent(enter, closed.deps)).resolves.toBe('gated');
    expect(closed.deps.claim).not.toHaveBeenCalled();
  });

  it('a pause that lands during the claim prevents the notification', async () => {
    const harness = setup();
    harness.deps.claim = jest.fn(async () => {
      harness.pause();
      return { ok: true as const, data: { allow: true as const, claimId: 'c', quest: { id: 'q1', title: 't', category: 'art', xpReward: 1, pointsReward: 1 } } };
    });
    await expect(processGeofenceEvent(enter, harness.deps)).resolves.toBe('gated_after_claim');
    expect(harness.deps.schedule).not.toHaveBeenCalled();
  });

  it('collapses duplicate and overlapping events onto one claim attempt', async () => {
    const { deps, state } = setup();
    await processGeofenceEvent(enter, deps);
    // OS repeats: same region reported inside again, then exit + enter inside the same window.
    await processGeofenceEvent(enter, deps);
    await processGeofenceEvent({ type: 'exit', regionId: 'v:a' }, deps);
    await expect(processGeofenceEvent(enter, deps)).resolves.toBe('no_candidate');
    expect(deps.claim).toHaveBeenCalledTimes(1);
    expect(Object.keys(state().processing)).toHaveLength(1);
  });

  it('a crash after reserving locally means no retry (missed beats duplicate)', async () => {
    const key = `install-1:v:a:${Math.floor(T0 / (3 * 3_600_000))}`;
    const crashed = setup({}, { processing: { [key]: { state: 'claiming', at: T0 } } });
    await expect(processGeofenceEvent(enter, crashed.deps)).resolves.toBe('duplicate');
    expect(crashed.deps.claim).not.toHaveBeenCalled();
  });

  it.each([
    ['stale bundle', {}, { bundle: { ...bundle, expiresAt: new Date(T0 - 1).toISOString() } }, 'stale_bundle'],
    ['different account', {}, { ownerUserId: 'user-2' }, 'no_session'],
    ['permissions revoked', { permissionsStillGranted: async () => false }, {}, 'permission_missing'],
  ])('fails closed on %s', async (_label, deps, statePatch, expected) => {
    const harness = setup(deps as Partial<PipelineDeps>, statePatch as Partial<AdventureState>);
    await expect(processGeofenceEvent(enter, harness.deps)).resolves.toBe(expected);
    expect(harness.deps.claim).not.toHaveBeenCalled();
  });

  it('server denial or timeout means no notification and no queued retry', async () => {
    const denied = setup({ claim: jest.fn(async () => ({ ok: true as const, data: { allow: false as const, reason: 'quiet_hours' } })) });
    await expect(processGeofenceEvent(enter, denied.deps)).resolves.toBe('denied:quiet_hours');
    const offline = setup({ claim: jest.fn(async () => ({ ok: false as const, error: 'timeout' })) });
    await expect(processGeofenceEvent(enter, offline.deps)).resolves.toBe('claim_failed:timeout');
    expect(denied.deps.schedule).not.toHaveBeenCalled();
    expect(offline.deps.schedule).not.toHaveBeenCalled();
    // A later event in the same window does not re-claim.
    await expect(processGeofenceEvent(enter, offline.deps)).resolves.toBe('ignored:duplicate');
  });

  it('shows an in-app suggestion instead of a system alert while Explore is visible', async () => {
    const { deps } = setup({ isDiscoveryVisible: () => true });
    await expect(processGeofenceEvent(enter, deps)).resolves.toBe('in_app');
    expect(deps.showInAppSuggestion).toHaveBeenCalled();
    expect(deps.claim).not.toHaveBeenCalled();
  });

  it('skips recording when the 3 s budget is spent', async () => {
    const harness = setup();
    harness.deps.schedule = jest.fn(async () => {
      harness.advance(CLAIM_BUDGET_MS);
      return true;
    });
    await expect(processGeofenceEvent(enter, harness.deps)).resolves.toBe('scheduled');
    expect(harness.deps.recordResult).not.toHaveBeenCalled();
  });

  it('refresh-region exits request a bundle refresh and never notify', async () => {
    const { deps } = setup();
    await expect(processGeofenceEvent({ type: 'exit', regionId: 'refresh:wynwood' }, deps)).resolves.toBe('refresh');
    expect(deps.refreshBundle).toHaveBeenCalled();
    expect(deps.schedule).not.toHaveBeenCalled();
  });
});

describe('nudgeCopy', () => {
  it('invites without precise location, scarcity or surveillance language', () => {
    expect(nudgeCopy('art', 15)).toBe('A quick art quest is nearby. Take a look while you’re out.');
    expect(nudgeCopy('outdoors', 45)).toBe('An outdoor quest is nearby. Take a look while you’re out.');
    expect(nudgeCopy('food', null)).not.toMatch(/saw you|hurry|only|left|at \d/i);
  });
});
