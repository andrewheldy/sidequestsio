import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderRouter, screen, testRouter } from 'expo-router/testing-library';
import { quest, questsHandler } from './discovery/fixtures';
import { installFakeSupabase } from './support/mockBackend';

// Routes render against the fake Supabase client (mocked; not device behaviour).
const backend = installFakeSupabase();

const rows = [quest('quest-123', { title: 'Mural Hunt' }), quest('5f0c8a1e-uuid-like', { title: 'Taco Trail' })];

beforeEach(() => {
  backend.reset(null, questsHandler(rows));
});

describe('consumer navigation', () => {
  it('opens Explore and keeps Rewards / Explore / Profile in order', async () => {
    const rendered = await renderRouter('./src/app', { initialUrl: '/' });

    expect(rendered.getPathname()).toBe('/');
    expect(await screen.findByText('Mural Hunt')).toBeVisible();
    const tabs = screen.getAllByRole('button', { name: /, tab, / });
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent('Rewards');
    expect(tabs[1]).toHaveTextContent('Explore');
    expect(tabs[1]).toBeSelected();
    expect(tabs[2]).toHaveTextContent('Profile');

    await fireEvent.press(tabs[0]);
    expect(rendered.getPathname()).toBe('/rewards');
    await fireEvent.press(screen.getByRole('button', { name: /Profile, tab/ }));
    expect(rendered.getPathname()).toBe('/profile');
    await fireEvent.press(screen.getByRole('button', { name: /Explore, tab/ }));
    expect(rendered.getPathname()).toBe('/');
  });

  it('opens a quest card with its string identifier and returns to Explore', async () => {
    const rendered = await renderRouter('./src/app', { initialUrl: '/' });
    await fireEvent.press(await screen.findByRole('button', { name: /^Taco Trail/ }));

    expect(rendered.getPathname()).toBe('/quests/5f0c8a1e-uuid-like');
    expect(await screen.findByRole('header', { name: 'Taco Trail' })).toBeVisible();
    expect(testRouter.canGoBack()).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    await waitFor(() => expect(rendered.getPathname()).toBe('/'));
    expect(screen.getByRole('button', { name: /Explore, tab/ })).toBeSelected();
  });

  it('opens direct quest links and anchors back navigation to Explore', async () => {
    const rendered = await renderRouter('./src/app', { initialUrl: '/quests/quest-123' });
    expect(await screen.findByRole('header', { name: 'Mural Hunt' })).toBeVisible();
    expect(testRouter.canGoBack()).toBe(true);
    await testRouter.back();
    expect(rendered.getPathname()).toBe('/');
  });

  it('ships no development-only sample quest link', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await screen.findByText('Mural Hunt');
    expect(screen.queryByRole('link', { name: 'Open sample quest' })).toBeNull();
  });
});
