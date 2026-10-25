import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { quest } from './discovery/fixtures';
import { makeSession, type RecordedCall } from './support/fakeSupabase';
import { installFakeSupabase } from './support/mockBackend';

// J1 cross-feature journey (Discovery + Account). Mocked backend: proves JS
// navigation/state wiring only, not device or live-backend behaviour.
const backend = installFakeSupabase();

const row = quest('q-journey', { title: 'Mural Hunt' });

function handler(profiles: Record<string, Record<string, unknown>>) {
  return (call: RecordedCall) => {
    if (call.name === 'quests') {
      return call.ops.some((o) => o.op === 'maybeSingle') ? { data: row } : { data: [row] };
    }
    if (call.name === 'profiles') {
      const upsert = call.ops.find((o) => o.op === 'upsert');
      if (upsert) {
        const payload = upsert.args[0] as Record<string, unknown>;
        profiles[payload.user_id as string] = { ...profiles[payload.user_id as string], ...payload };
        return { data: null };
      }
      const eq = call.ops.find((o) => o.op === 'eq');
      return { data: profiles[eq?.args[1] as string] ?? null };
    }
    return undefined;
  };
}

async function guestStartsQuest() {
  const rendered = await renderRouter('./src/app', { initialUrl: '/' });
  await fireEvent.press(await screen.findByRole('button', { name: /^Mural Hunt/ }));
  await waitFor(() => expect(rendered.getPathname()).toBe('/quests/q-journey'));
  await fireEvent.press(await screen.findByRole('button', { name: 'Start quest' }));
  await waitFor(() => expect(rendered.getPathname()).toBe('/auth/sign-in'));
  return rendered;
}

async function signIn() {
  await fireEvent.changeText(screen.getByLabelText('Email'), 'explorer@example.test');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'secret1');
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
}

it('guest -> quest -> Start -> sign in (completed profile) -> back on the same quest, no onboarding', async () => {
  const fake = backend.reset(null, handler({ u1: { user_id: 'u1', onboarding_completed: true } }));
  (fake.client.auth.signInWithPassword as jest.Mock).mockImplementation(async () => {
    fake.setSession(makeSession('u1'));
    return { data: {}, error: null };
  });
  const rendered = await guestStartsQuest();
  await signIn();
  await waitFor(() => expect(rendered.getPathname()).toBe('/quests/q-journey'));
  expect(await screen.findByRole('header', { name: 'Mural Hunt' })).toBeVisible();
});

it('guest -> quest -> sign in (incomplete profile) -> onboarding, without marking it complete', async () => {
  const profiles: Record<string, Record<string, unknown>> = { u2: { user_id: 'u2', onboarding_completed: false, interests: [] } };
  const fake = backend.reset(null, handler(profiles));
  (fake.client.auth.signInWithPassword as jest.Mock).mockImplementation(async () => {
    fake.setSession(makeSession('u2'));
    return { data: {}, error: null };
  });
  const rendered = await guestStartsQuest();
  await signIn();
  await waitFor(() => expect(rendered.getPathname()).toBe('/onboarding'));
  expect(profiles.u2.onboarding_completed).toBe(false);
});
