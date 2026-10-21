import { renderRouter, screen } from 'expo-router/testing-library';

// No Supabase configured: screens render the setup state and never touch fixtures.
jest.doMock('../../src/lib/config', () => {
  const actual = jest.requireActual('../../src/lib/config');
  return { ...actual, backend: { status: 'missing', message: 'This build has no backend configured.' } };
});

it('Explore shows the setup state', async () => {
  await renderRouter('./src/app', { initialUrl: '/' });
  expect(await screen.findByText('Backend not configured')).toBeVisible();
  expect(screen.getByText('This build has no backend configured.')).toBeVisible();
});

it('Quest detail shows the setup state', async () => {
  await renderRouter('./src/app', { initialUrl: '/quests/abc' });
  expect(await screen.findByText('Backend not configured')).toBeVisible();
});
