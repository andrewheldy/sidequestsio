import * as Location from 'expo-location';
import { act, fireEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockedLocation = Location as jest.Mocked<typeof Location>;

const quest = (id: string, title: string) => ({
  id, title, description: '', category: 'art', difficulty: 'easy', xpReward: 50, pointsReward: 25, imageUrl: null,
  venueId: `venue-${id}`, venueName: 'Gallery', locationLabel: 'Wynwood', latitude: 25.8, longitude: -80.2, distanceM: 1200,
  estimatedMinutes: 15, verificationType: 'qr', accessNotes: null, isSponsored: false, startsAt: null, endsAt: null,
  availability: { state: 'unknown', closesAt: null }, reasons: ['fits_15_minutes'], score: 0.6,
});

type Body = Record<string, unknown>;
let respond: (body: Body) => unknown;
const bodies: Body[] = [];

beforeEach(async () => {
  await AsyncStorage.clear();
  bodies.length = 0;
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://project.example.co';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable';
  respond = (body) => ({
    ok: true,
    serverTime: '2026-10-24T15:00:00Z',
    origin: { source: body.p_source, areaId: body.p_area_id, label: body.p_area_id === 'brickell' ? 'Brickell' : body.p_area_id ? 'Wynwood' : null },
    items: [quest('q1', 'Wynwood Mural Hunt')],
    nextCursor: null,
  });
  global.fetch = jest.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as Body;
    bodies.push(body);
    const payload = respond(body);
    return { ok: true, status: 200, text: async () => JSON.stringify(payload) } as unknown as Response;
  }) as unknown as typeof fetch;
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
});

describe('Explore discovery', () => {
  it('starts in Manual: area results, no device location, no permission prompt', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText('Wynwood Mural Hunt')).toBeVisible();
    expect(screen.getByText('Around Wynwood')).toBeVisible();
    expect(screen.getByText('Fits in about 15 minutes')).toBeVisible();
    expect(bodies[0]).toMatchObject({ p_source: 'area', p_area_id: 'wynwood', p_origin_lat: null, p_origin_lng: null, p_radius_m: 3000 });
    expect(mockedLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(mockedLocation.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('explains before asking, and a refusal keeps manual discovery working', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await screen.findByText('Wynwood Mural Hunt');
    await fireEvent.press(screen.getByRole('button', { name: /Near me/ }));
    expect(screen.getByText(/Your location isn’t saved/)).toBeVisible();
    await fireEvent.press(screen.getByRole('button', { name: 'Use my location' }));
    expect(await screen.findByText(/Location is off for SideQuests/)).toBeVisible();
    expect(screen.getByText('Wynwood Mural Hunt')).toBeVisible();
    expect(bodies.every((b) => b.p_source === 'area')).toBe(true);
  });

  it('changes area and radius through explicit selections', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await screen.findByText('Wynwood Mural Hunt');
    await fireEvent.press(screen.getByRole('button', { name: 'Brickell' }));
    expect(await screen.findByText('Around Brickell')).toBeVisible();
    expect(bodies.at(-1)).toMatchObject({ p_source: 'area', p_area_id: 'brickell' });
  });

  it('uses the device only after permission, and a map pan searches that area without claiming presence', async () => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true, canAskAgain: true, ios: { accuracy: 'full' } } as never);
    mockedLocation.getLastKnownPositionAsync.mockResolvedValue({ coords: { latitude: 25.79, longitude: -80.19, accuracy: 25 }, timestamp: Date.now() } as never);
    await AsyncStorage.setItem('sq.device.v1', JSON.stringify({ installationId: 'i', desiredMode: 'explore', adventurePaused: false, selectedAreaId: null, radiusKm: 3 }));

    await renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText('Near you')).toBeVisible();
    expect(bodies.find((b) => b.p_source === 'device')).toMatchObject({ p_origin_lat: 25.79, p_origin_lng: -80.19 });

    await fireEvent.press(screen.getByRole('button', { name: 'Map' }));
    const map = screen.getByLabelText(/Map of quests/);
    await act(async () => map.props.onRegionChangeComplete({ latitude: 25.76, longitude: -80.19 }, { isGesture: true }));
    await fireEvent.press(screen.getByRole('button', { name: 'Search this area' }));
    expect(await screen.findByText('Search this map area')).toBeVisible();
    expect(bodies.at(-1)).toMatchObject({ p_source: 'map', p_origin_lat: 25.76 });
    mockedLocation.getForegroundPermissionsAsync.mockReset();
    mockedLocation.getLastKnownPositionAsync.mockReset();
  });

  it('offers an explicit radius expansion when empty instead of showing distant quests', async () => {
    respond = (body) => ({ ok: true, serverTime: '', origin: { source: body.p_source, areaId: 'wynwood', label: 'Wynwood' }, items: [], nextCursor: null });
    await renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText(/No quests within/)).toBeVisible();
    await fireEvent.press(screen.getByRole('button', { name: /Search within/ }));
    expect(bodies.at(-1)).toMatchObject({ p_radius_m: 5000 });
  });

  it('shows an in-place retry on network failure', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    await renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText(/couldn’t load quests/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
