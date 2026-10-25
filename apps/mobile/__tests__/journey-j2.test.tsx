import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { completeOk, completionRow, makeWorld, QUEST_ID, rpcCalls, scanPayload, worldHandler } from './quest-loop/support';
import { makeSession } from './support/fakeSupabase';
import { installFakeSupabase } from './support/mockBackend';

// J2 cross-feature journey (quest loop + profile + session). Mocked backend and
// camera: proves JS wiring/cache behaviour only, not device or live backend.
const backend = installFakeSupabase();
const cameraMock = jest.requireMock('expo-camera').useCameraPermissions as jest.Mock;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  cameraMock.mockReturnValue([{ granted: true, canAskAgain: true, status: 'granted' }, jest.fn()]);
});

it('a server-confirmed completion appears in Profile history, and signing out clears it', async () => {
  const world = makeWorld({ completions: [] });
  // The fake server records the completion and the progression it awards.
  world.complete = () => {
    world.completions = [{ ...completionRow(), quest: { id: QUEST_ID, title: 'Loop Quest', category: 'art', image_url: null } }];
    world.progress = { ...world.progress!, xp: 420, points_balance_cache: 135, completed_quests_count: 3 };
    return completeOk();
  };
  const fake = backend.reset(makeSession('u1'), worldHandler(world));
  const rendered = await renderRouter('./src/app', { initialUrl: `/quests/${QUEST_ID}/complete` });

  await fireEvent.press(await screen.findByRole('button', { name: 'Scan the SideQuests code' }, { timeout: 8000 }));
  await screen.findByTestId('camera-view');
  await scanPayload('https://miamisidequests.io/scan/ABCD1234');
  await fireEvent.press(await screen.findByRole('button', { name: 'Complete quest' }));
  expect(await screen.findByRole('button', { name: 'Explore more' })).toBeVisible();
  expect(rpcCalls(world, 'complete_quest')).toHaveLength(1);

  await fireEvent.press(screen.getByRole('button', { name: 'Explore more' }));
  await fireEvent.press(await screen.findByRole('button', { name: /Profile, tab/ }));
  await waitFor(() => expect(rendered.getPathname()).toBe('/profile'));
  expect(await screen.findByText('Loop Quest', {}, { timeout: 8000 })).toBeVisible();
  expect(screen.getByText(/420/)).toBeVisible();

  await act(async () => fake.setSession(null));
  await waitFor(() => expect(screen.queryByText('Loop Quest')).toBeNull());
  expect(screen.queryByText(/420/)).toBeNull();
  expect(await screen.findByRole('button', { name: /Sign in/ })).toBeVisible();
});
