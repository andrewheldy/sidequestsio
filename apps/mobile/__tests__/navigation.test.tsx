import { fireEvent } from '@testing-library/react-native';
import { renderRouter, screen, testRouter } from 'expo-router/testing-library';

describe('consumer navigation foundation', () => {
  it('opens Explore and keeps Rewards / Explore / Profile in order', async () => {
    const rendered = await renderRouter('./src/app', { initialUrl: '/' });

    expect(rendered.getPathname()).toBe('/');
    expect(screen.getByText('Your next side quest starts here.')).toBeVisible();
    const tabs = screen.getAllByRole('button', { name: /, tab, / });
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent('Rewards');
    expect(tabs[1]).toHaveTextContent('Explore');
    expect(tabs[1]).toBeSelected();
    expect(tabs[2]).toHaveTextContent('Profile');

    await fireEvent.press(tabs[0]);
    expect(rendered.getPathname()).toBe('/rewards');
    expect(screen.getByText('Your rewards will appear here.')).toBeVisible();
    await fireEvent.press(screen.getByRole('button', { name: /Profile, tab/ }));
    expect(rendered.getPathname()).toBe('/profile');
    expect(screen.getByText('Your explorer profile will appear here.')).toBeVisible();
  });

  it('opens a sample quest with its identifier and returns through the stack', async () => {
    const rendered = await renderRouter('./src/app', { initialUrl: '/' });
    await fireEvent.press(screen.getByRole('link', { name: 'Open sample quest' }));

    expect(rendered.getPathname()).toBe('/quests/sample-quest');
    expect(screen.getByText('Quest ID: sample-quest')).toBeVisible();
    expect(testRouter.canGoBack()).toBe(true);
    await testRouter.back();

    expect(rendered.getPathname()).toBe('/');
    expect(screen.getByRole('button', { name: /Explore, tab/ })).toBeSelected();
  });

  it('receives arbitrary quest identifiers through a direct route', async () => {
    const rendered = await renderRouter('./src/app', { initialUrl: '/quests/quest-123' });
    expect(screen.getByText('Quest ID: quest-123')).toBeVisible();
    expect(testRouter.canGoBack()).toBe(true);
    await testRouter.back();
    expect(rendered.getPathname()).toBe('/');
  });

  it('omits the sample item outside development', async () => {
    const development = __DEV__;
    Object.defineProperty(globalThis, '__DEV__', { value: false, configurable: true });
    try {
      const rendered = await renderRouter('./src/app', { initialUrl: '/' });
      expect(screen.queryByRole('link', { name: 'Open sample quest' })).toBeNull();
    } finally {
      Object.defineProperty(globalThis, '__DEV__', { value: development, configurable: true });
    }
  });
});
