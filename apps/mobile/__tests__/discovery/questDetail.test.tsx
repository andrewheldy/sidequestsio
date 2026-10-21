import { fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { makeSession } from '../support/fakeSupabase';
import { installFakeSupabase } from '../support/mockBackend';
import { profileRow, quest, questsHandler, venue } from './fixtures';

const backend = installFakeSupabase();

const full = quest('q-full', {
  title: 'Globe Snap',
  description: 'Snap the globe.',
  funky_action: 'Photograph the globe',
  action_prompt: 'Stand by the fountain.',
  estimated_time: '10 min',
  xp_reward: 77,
  points_reward: 33,
  links: {
    website_url: 'https://example.test/site',
    instagram_url: 'https://instagram.test/venue',
    tiktok_url: 'http://insecure.test/tt', // not https: never shown
    menu_url: null,
    action_points: 500,
  },
  venue: venue({ name: 'Globe Venue', hours: 'Open 9-5', hours_note: 'Closed Mondays', price_range: '$$', description: 'A fine venue.' }),
});
const bare = quest('q-bare', { links: null, venue: null, verification_type: 'qr' });
const gps = quest('q-gps', { verification_type: 'gps' });
const paused = quest('q-paused', { status: 'paused' });
const rows = [full, bare, gps, paused];

const handlerFor = (userId?: string) => {
  const quests = questsHandler(rows);
  return (call: Parameters<typeof quests>[0]) =>
    userId && call.name === 'profiles' ? { data: profileRow(userId) } : quests(call);
};

/** The session restores asynchronously; Start is blocked until it settles, so press until it navigates. */
async function pressStartUntil(rendered: { getPathname: () => string }, pathname: string) {
  for (let i = 0; i < 40 && rendered.getPathname() !== pathname; i++) {
    await fireEvent.press(screen.getByRole('button', { name: 'Start quest' }));
    if (rendered.getPathname() !== pathname) await new Promise((resolve) => setTimeout(resolve, 50));
  }
  expect(rendered.getPathname()).toBe(pathname);
}

it('renders the fetched record, not hard-coded content', async () => {
  backend.reset(null, handlerFor());
  await renderRouter('./src/app', { initialUrl: '/quests/q-full' });
  expect(await screen.findByText('Globe Snap')).toBeVisible();
  expect(screen.getByText('Snap the globe.')).toBeVisible();
  expect(screen.getByText('Miami · Art')).toBeVisible();
  expect(screen.getByText('Photograph the globe')).toBeVisible();
  expect(screen.getByText('Stand by the fountain.')).toBeVisible();
  expect(screen.getByText('10 min')).toBeVisible();
  expect(screen.getByText('77 XP')).toBeVisible();
  expect(screen.getByText('33 Points')).toBeVisible();
  expect(screen.getByText('Globe Venue')).toBeVisible();
  expect(screen.getByText('Closed Mondays')).toBeVisible();
  expect(screen.getByText('$$')).toBeVisible();
  expect(screen.getByText(/scan the SideQuests QR code/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Directions' })).toBeVisible();
  // No location permission: no distance chip.
  expect(screen.queryByText(/ mi$/)).toBeNull();
  expect(screen.queryByText('500')).toBeNull();
});

it('shows only the links present in quest.links and opens https urls', async () => {
  backend.reset(null, handlerFor());
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
  await renderRouter('./src/app', { initialUrl: '/quests/q-full' });
  await screen.findByText('Globe Snap');
  expect(screen.getByRole('link', { name: 'Website' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Instagram' })).toBeVisible();
  expect(screen.queryByRole('link', { name: 'TikTok' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Menu' })).toBeNull();
  await fireEvent.press(screen.getByRole('link', { name: 'Instagram' }));
  expect(open).toHaveBeenCalledWith('https://instagram.test/venue');
  open.mockRestore();
});

it('omits links, venue and directions sections when the data is absent', async () => {
  backend.reset(null, handlerFor());
  await renderRouter('./src/app', { initialUrl: '/quests/q-bare' });
  expect(await screen.findByText('Quest q-bare')).toBeVisible();
  expect(screen.queryByText('Links')).toBeNull();
  expect(screen.queryByText('About the venue')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Directions' })).toBeNull();
});

it('shows not-found for an unknown quest and for a non-active quest', async () => {
  backend.reset(null, handlerFor());
  await renderRouter('./src/app', { initialUrl: '/quests/nope' });
  expect(await screen.findByText('Quest not available')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Go back' })).toBeVisible();
});

it('treats a paused quest as not available', async () => {
  backend.reset(null, handlerFor());
  await renderRouter('./src/app', { initialUrl: '/quests/q-paused' });
  expect(await screen.findByText('Quest not available')).toBeVisible();
});

it('shows an error with retry', async () => {
  let fail = true;
  backend.reset(null, (call) => (fail ? { error: new Error('offline') } : handlerFor()(call)));
  await renderRouter('./src/app', { initialUrl: '/quests/q-full' });
  expect(await screen.findByText("Couldn't load this quest", {}, { timeout: 8000 })).toBeVisible();
  fail = false;
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Globe Snap')).toBeVisible();
});

it('sends a guest to sign-in with returnTo=quest:<id>', async () => {
  backend.reset(null, handlerFor());
  const rendered = await renderRouter('./src/app', { initialUrl: '/quests/q-full' });
  await screen.findByText('Globe Snap');
  await pressStartUntil(rendered, '/auth/sign-in');
  expect(rendered.getSearchParams()).toMatchObject({ returnTo: 'quest:q-full' });
});

it('sends a ready user to the completion route', async () => {
  backend.reset(makeSession('u1'), handlerFor('u1'));
  const rendered = await renderRouter('./src/app', { initialUrl: '/quests/q-full' });
  await screen.findByText('Globe Snap');
  await pressStartUntil(rendered, '/quests/q-full/complete');
});

it('disables Start for non-QR verification types with an explanation', async () => {
  backend.reset(null, handlerFor());
  const rendered = await renderRouter('./src/app', { initialUrl: '/quests/q-gps' });
  await screen.findByText('Quest q-gps');
  expect(screen.getByRole('button', { name: 'Start quest' })).toBeDisabled();
  expect(screen.getByText(/isn't supported in the app yet/)).toBeVisible();
  await fireEvent.press(screen.getByRole('button', { name: 'Start quest' }));
  expect(rendered.getPathname()).toBe('/quests/q-gps');
});
