import { computeCapability, type CapabilityInput } from '../src/lib/adventure/capability';

const granted = { servicesEnabled: true, foreground: 'granted', background: 'granted', precise: true, canAskForeground: true } as const;
const base: CapabilityInput = {
  desiredMode: 'adventure',
  paused: false,
  nearbyEnabled: true,
  adventureEnabled: true,
  backgroundBuild: true,
  signedIn: true,
  permissions: granted,
  notificationsGranted: true,
};

describe('computeCapability', () => {
  it('is active only when every Adventure prerequisite holds', () => {
    expect(computeCapability(base)).toMatchObject({ effectiveMode: 'adventure', adventureActive: true, adventureBlockers: [] });
  });

  it('starts in Manual with no permissions and never claims device location', () => {
    const result = computeCapability({ ...base, desiredMode: 'manual', permissions: null, notificationsGranted: false, signedIn: false });
    expect(result).toMatchObject({ effectiveMode: 'manual', canUseDeviceLocation: false, adventureActive: false });
  });

  it('reports the real state when notifications are missing', () => {
    const result = computeCapability({ ...base, notificationsGranted: false });
    expect(result.effectiveMode).toBe('explore');
    expect(result.adventureBlockers).toEqual(['notifications']);
    expect(result.summary).toBe('Explore is on. Nearby alerts need notification permission.');
  });

  it.each([
    [{ adventureEnabled: false }, 'flag_off'],
    [{ backgroundBuild: false }, 'build_without_background'],
    [{ signedIn: false }, 'sign_in'],
    [{ paused: true }, 'paused'],
    [{ permissions: { ...granted, background: 'denied' as const } }, 'background_permission'],
    [{ permissions: { ...granted, precise: false } }, 'precise_location'],
  ])('blocks Adventure on %o', (patch, blocker) => {
    const result = computeCapability({ ...base, ...patch });
    expect(result.adventureActive).toBe(false);
    expect(result.adventureBlockers).toContain(blocker);
  });

  it('falls back to area browsing when foreground permission is denied in Explore', () => {
    const result = computeCapability({ ...base, desiredMode: 'explore', permissions: { ...granted, foreground: 'denied', background: 'denied' } });
    expect(result.effectiveMode).toBe('manual');
    expect(result.summary).toMatch(/results follow the area you choose/);
  });

  it('Explore with foreground only does not imply background monitoring', () => {
    const result = computeCapability({ ...base, desiredMode: 'explore', permissions: { ...granted, background: 'denied' } });
    expect(result).toMatchObject({ effectiveMode: 'explore', adventureActive: false, adventureBlockers: [] });
  });
});
