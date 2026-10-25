import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { makeSession } from '../support/fakeSupabase';
import { installFakeSupabase } from '../support/mockBackend';
import { makeWorld, worldHandler, type World } from './support';

const backend = installFakeSupabase();
let world: World;

const mount = (signedIn = true) => {
  backend.reset(signedIn ? makeSession('u1') : null, worldHandler(world));
  return renderRouter('./src/app', { initialUrl: '/rewards' });
};

beforeEach(() => {
  world = makeWorld();
});

it('explains Points to guests and links to sign-in with returnTo=tab:rewards', async () => {
  const rendered = await mount(false);
  expect(await screen.findByText('Points & XP', {}, { timeout: 8000 })).toBeVisible();
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in to see your Points' }));
  await waitFor(() => expect(rendered.getPathname()).toBe('/auth/sign-in'));
  expect(rendered.getSearchParams()).toMatchObject({ returnTo: 'tab:rewards' });
});

it('shows the spendable balance and XP/level, and lists active rewards read-only', async () => {
  world.rewards = [
    { id: 'r1', partner_id: 'p', title: 'Free Coffee', description: 'Any size', points_cost: 50, inventory: 3, status: 'active', expiration_date: null, image_url: null },
    { id: 'r2', partner_id: 'p', title: 'Expired Treat', description: '', points_cost: 10, inventory: null, status: 'active', expiration_date: '2020-01-01T00:00:00Z', image_url: null },
    { id: 'r3', partner_id: 'p', title: 'Sold Out Tee', description: '', points_cost: 200, inventory: 0, status: 'active', expiration_date: null, image_url: null },
  ];
  await mount();
  expect(await screen.findByText('Free Coffee', {}, { timeout: 8000 })).toBeVisible();
  expect(screen.getByLabelText('90 Points')).toBeVisible();
  expect(screen.getByText('Level 2 · 300 XP')).toBeVisible();
  expect(screen.getByText('50 Points')).toBeVisible();
  expect(screen.getByText('3 left')).toBeVisible();
  expect(screen.getByText('Out of stock')).toBeVisible();
  expect(screen.queryByText('Expired Treat')).toBeNull();
  expect(screen.queryByRole('button', { name: /redeem/i })).toBeNull();
});

it('shows the empty state when there are no rewards', async () => {
  await mount();
  expect(await screen.findByText('No rewards available yet.', {}, { timeout: 8000 })).toBeVisible();
  expect(screen.getByText('Points you earn stay in your balance.')).toBeVisible();
  expect(screen.queryByRole('button', { name: /redeem/i })).toBeNull();
});

it('shows balance unavailable (never zero) when progress is missing or fails, with retry', async () => {
  world.progress = null;
  await mount();
  expect(await screen.findByText('Balance unavailable', {}, { timeout: 8000 })).toBeVisible();
  expect(screen.queryByLabelText('0 Points')).toBeNull();
  world.progress = { user_id: 'u1', xp: 10, level: 1, points_balance_cache: 5, lifetime_points: 5, completed_quests_count: 1, rewards_redeemed_count: 0 };
  await fireEvent.press(screen.getAllByRole('button', { name: 'Try again' })[0]);
  expect(await screen.findByLabelText('5 Points')).toBeVisible();
});

it('shows balance unavailable when the progress read errors', async () => {
  world.progressError = true;
  await mount();
  expect(await screen.findByText('Balance unavailable', {}, { timeout: 15000 })).toBeVisible();
  expect(screen.getByText("We couldn't load your Points and XP right now.")).toBeVisible();
});

it('shows a retryable error when rewards fail to load', async () => {
  world.rewardsError = true;
  await mount();
  expect(await screen.findByText("Couldn't load rewards", {}, { timeout: 15000 })).toBeVisible();
});
