import { fireEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

const card = {
  id: 'q1', title: 'Wynwood Mural Hunt', description: 'Find eight details.', category: 'art', difficulty: 'easy',
  xpReward: 50, pointsReward: 25, imageUrl: null, venueId: 'v', venueName: 'Gallery', locationLabel: 'Wynwood',
  latitude: 25.8, longitude: -80.2, distanceM: null, estimatedMinutes: 20, verificationType: 'qr', accessNotes: null,
  isSponsored: false, startsAt: null, endsAt: null, availability: { state: 'unknown', closesAt: null }, reasons: [], score: null,
};

// The Explore tab stays mounted underneath, so answer each RPC by name.
function serve(payload: unknown) {
  global.fetch = jest.fn(async (url: string) => {
    const body = url.endsWith('/get_quest_card') ? payload : { ok: true, serverTime: '', origin: { source: 'area', areaId: 'wynwood', label: 'Wynwood' }, items: [], nextCursor: null };
    return { ok: true, status: 200, text: async () => JSON.stringify(body) } as unknown as Response;
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://project.example.co';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable';
});
afterEach(() => {
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
});

describe('quest detail (notification and list destination)', () => {
  it('shows canonical server rewards and unconfirmed hours honestly', async () => {
    serve({ ok: true, serverTime: '', state: 'available', quest: card });
    await renderRouter('./src/app', { initialUrl: '/quests/q1' });
    expect(await screen.findByText('Wynwood Mural Hunt')).toBeVisible();
    expect(screen.getByText('50 XP')).toBeVisible();
    expect(screen.getByText('25 Points')).toBeVisible();
    expect(screen.getByText('Hours not confirmed')).toBeVisible();
    expect(screen.queryByText('Check in with GPS')).toBeNull();
  });

  it('opens a useful unavailable state when the quest has ended since the alert', async () => {
    serve({ ok: true, serverTime: '', state: 'expired', quest: null });
    await renderRouter('./src/app', { initialUrl: '/quests/q1' });
    expect(await screen.findByText('This quest has ended.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'See other quests nearby' })).toBeVisible();
  });

  it('GPS quests ask for sign-in instead of awarding anything', async () => {
    serve({ ok: true, serverTime: '', state: 'available', quest: { ...card, verificationType: 'gps' } });
    await renderRouter('./src/app', { initialUrl: '/quests/q1' });
    await fireEvent.press(await screen.findByRole('button', { name: 'Check in with GPS' }));
    expect(await screen.findByText(/Sign in to check in with GPS/)).toBeVisible();
  });
});
