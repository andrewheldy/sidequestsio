import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { handleSessionChange, startAdventure, stopAdventure } from '../src/lib/adventure/controller';
import { routeFromNotification } from '../src/lib/adventure/notifications';
import { loadAdventureState, saveAdventureState } from '../src/lib/storage/deviceStore';

const mockedLocation = Location as jest.Mocked<typeof Location>;
const mockedNotifications = Notifications as jest.Mocked<typeof Notifications>;

describe('stopAdventure', () => {
  it('closes the persisted gate before unregistering regions or cancelling alerts', async () => {
    await saveAdventureState({ gateOpen: true, ownerUserId: 'u1', registeredVersion: 'v1' });
    const gateAtUnregister: boolean[] = [];
    mockedLocation.hasStartedGeofencingAsync.mockResolvedValueOnce(true);
    mockedLocation.stopGeofencingAsync.mockImplementationOnce(async () => {
      gateAtUnregister.push((await loadAdventureState()).gateOpen);
    });
    mockedNotifications.getAllScheduledNotificationsAsync.mockResolvedValueOnce([
      { identifier: 'nudge:c1' },
      { identifier: 'other-feature' },
    ] as never);

    await stopAdventure('pause', null);

    expect(gateAtUnregister).toEqual([false]);
    expect(mockedNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('nudge:c1');
    expect(mockedNotifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('other-feature');
    expect(await loadAdventureState()).toMatchObject({ gateOpen: false, bundle: null, registeredVersion: null });
  });

  it('works offline (server sync failure does not block local cleanup)', async () => {
    await saveAdventureState({ gateOpen: true });
    global.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    await stopAdventure('pause', { userId: 'u1', accessToken: 't' });
    expect((await loadAdventureState()).gateOpen).toBe(false);
  });

  it('clears the old account on sign-out or account switch', async () => {
    await saveAdventureState({ gateOpen: true, ownerUserId: 'u1', recentQuests: { q: 1 } });
    await handleSessionChange({ userId: 'u2', accessToken: 't' });
    expect(await loadAdventureState()).toMatchObject({ gateOpen: false, ownerUserId: null, recentQuests: {} });
  });
});

describe('startAdventure', () => {
  it('requires a signed-in session (mobile auth is not built yet)', async () => {
    const sample = { latitude: 25.8, longitude: -80.2, accuracyM: 10, capturedAt: Date.now(), source: 'current' as const };
    await expect(startAdventure(sample)).resolves.toEqual({ ok: false, reason: 'sign_in' });
    expect(mockedLocation.startGeofencingAsync).not.toHaveBeenCalled();
  });
});

describe('routeFromNotification', () => {
  const response = (data: unknown) => ({ notification: { request: { identifier: 'nudge:c', content: { data } } } }) as never;

  it('accepts only in-app quest routes', () => {
    expect(routeFromNotification(response({ url: '/quests/30000000-0000-0000-0000-000000000001', claimId: 'c' }))).toEqual({
      url: '/quests/30000000-0000-0000-0000-000000000001',
      claimId: 'c',
    });
    expect(routeFromNotification(response({ url: 'https://evil.example/quests/1' }))).toBeNull();
    expect(routeFromNotification(response({ url: '/settings/location' }))).toBeNull();
    expect(routeFromNotification(null)).toBeNull();
  });
});
