import { fireEvent, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { renderRouter, screen } from 'expo-router/testing-library';
import { installFakeSupabase } from '../support/mockBackend';
import { quest, questsHandler, venue } from './fixtures';

const backend = installFakeSupabase();

const rows = [
  quest('q-art', { title: 'Mural Hunt', category: 'art' }),
  quest('q-food', {
    title: 'Taco Trail',
    category: 'food',
    venue: venue({ id: 'v-2', name: 'Taqueria Test', neighborhood: 'Little Havana', latitude: 25.77, longitude: -80.22 }),
  }),
  quest('q-nocoords', {
    title: 'Secret Stamp',
    category: 'art',
    venue: venue({ id: 'v-3', name: 'No Coords Venue', latitude: null, longitude: null, neighborhood: null }),
  }),
];

const ready = (extra: Record<string, unknown> = {}) => backend.reset(null, questsHandler(rows.map((r) => ({ ...r, ...extra }))));

beforeEach(() => jest.clearAllMocks());

it('lists real fetched quests as a guest without asking for location', async () => {
  ready();
  await renderRouter('./src/app', { initialUrl: '/' });
  expect(await screen.findByText('Mural Hunt')).toBeVisible();
  expect(screen.getByText('Taco Trail')).toBeVisible();
  expect(screen.getByText('Secret Stamp')).toBeVisible();
  expect(screen.getAllByText('120 XP').length).toBe(3);
  expect(screen.getAllByText('45 Points').length).toBe(3);
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  // No location: no distance anywhere.
  expect(screen.queryByText(/ mi$/)).toBeNull();
});

it('filters by category derived from the data, and by neighborhood', async () => {
  ready();
  await renderRouter('./src/app', { initialUrl: '/' });
  await screen.findByText('Mural Hunt');

  expect(screen.queryByRole('button', { name: 'Nightlife' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Food & Drink' }));
  expect(screen.queryByText('Mural Hunt')).toBeNull();
  expect(screen.getByText('Taco Trail')).toBeVisible();

  await fireEvent.press(screen.getByRole('button', { name: 'All' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Wynwood' }));
  expect(screen.getByText('Mural Hunt')).toBeVisible();
  expect(screen.queryByText('Taco Trail')).toBeNull();
});

it('shows an empty state with clear-filters when nothing matches', async () => {
  ready();
  await renderRouter('./src/app', { initialUrl: '/' });
  await screen.findByText('Mural Hunt');
  await fireEvent.press(screen.getByRole('button', { name: 'Food & Drink' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Wynwood' }));
  expect(screen.getByText('No quests match')).toBeVisible();
  await fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
  expect(await screen.findByText('Mural Hunt')).toBeVisible();
});

it('shows an empty state when there are no quests at all', async () => {
  backend.reset(null, questsHandler([]));
  await renderRouter('./src/app', { initialUrl: '/' });
  expect(await screen.findByText('No quests yet')).toBeVisible();
});

it('shows an error with retry and never falls back to fake data', async () => {
  let fail = true;
  backend.reset(null, (call) => (fail ? { error: new Error('offline') } : questsHandler(rows)(call)));
  await renderRouter('./src/app', { initialUrl: '/' });
  expect(await screen.findByText("Couldn't load quests", {}, { timeout: 8000 })).toBeVisible();
  expect(screen.queryByText('Mural Hunt')).toBeNull();
  fail = false;
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Mural Hunt')).toBeVisible();
});

it('opens quest detail with the string id when a card is pressed', async () => {
  ready();
  const rendered = await renderRouter('./src/app', { initialUrl: '/' });
  await fireEvent.press(await screen.findByRole('button', { name: /^Taco Trail/ }));
  await waitFor(() => expect(rendered.getPathname()).toBe('/quests/q-food'));
  expect(await screen.findByText('Description for q-food')).toBeVisible();
});

it('asks for location only on Near me, then sorts by distance and shows distance', async () => {
  ready();
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({ granted: true, status: 'granted', canAskAgain: true } as never);
  await renderRouter('./src/app', { initialUrl: '/' });
  await screen.findByText('Mural Hunt');
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByRole('button', { name: 'Near me' }));
  await waitFor(() => expect(screen.getAllByText(/ mi$/).length).toBe(2)); // third venue has no coordinates
  const titles = screen.getAllByRole('button', { name: /^(Mural Hunt|Taco Trail|Secret Stamp)/ }).map((b) => b.props.accessibilityLabel as string);
  expect(titles[0]).toMatch(/^Mural Hunt/); // 25.80,-80.19 is nearer to the mocked 25.79,-80.19 than Taco Trail
  expect(titles[2]).toMatch(/^Secret Stamp/);
});

it('explains denied location and keeps the list working', async () => {
  ready();
  await renderRouter('./src/app', { initialUrl: '/' });
  await screen.findByText('Mural Hunt');
  await fireEvent.press(screen.getByRole('button', { name: 'Near me' }));
  expect(await screen.findByText(/Location is off/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Open settings' })).toBeVisible();
  expect(screen.getByText('Mural Hunt')).toBeVisible();
  expect(screen.queryByText(/ mi$/)).toBeNull();
});

it('map view marks quests with coordinates and syncs the selected card', async () => {
  ready();
  const rendered = await renderRouter('./src/app', { initialUrl: '/' });
  await screen.findByText('Mural Hunt');
  await fireEvent.press(screen.getByRole('tab', { name: 'Map view' }));

  const markers = screen.getAllByTestId('map-marker');
  expect(markers).toHaveLength(2); // the quest without coordinates is list-only
  expect(screen.getByText('1 quest(s) have no map location. Switch to List to see them.')).toBeVisible();
  expect(screen.getByRole('button', { name: /^Mural Hunt/ })).toBeVisible();

  await fireEvent.press(markers.find((m) => m.props.title === 'Taco Trail')!);
  await fireEvent.press(await screen.findByRole('button', { name: /^Taco Trail/ }));
  await waitFor(() => expect(rendered.getPathname()).toBe('/quests/q-food'));
});
