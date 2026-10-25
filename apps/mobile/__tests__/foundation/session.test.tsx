import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { makeSession, type RecordedCall } from '../support/fakeSupabase';
import { installFakeSupabase } from '../support/mockBackend';

const backend = installFakeSupabase();
// Imported after the mock is installed.
const { SessionProvider, useSession } = require('../../src/session/SessionProvider') as typeof import('../../src/session/SessionProvider');
const { storageKeys } = require('../../src/lib/appStorage') as typeof import('../../src/lib/appStorage');

function Probe() {
  const { state } = useSession();
  return <Text testID="status">{state.status}{'profile' in state ? `:${state.profile.user_id}` : ''}</Text>;
}

function renderProvider(client = new QueryClient()) {
  render(
    <QueryClientProvider client={client}>
      <SessionProvider>
        <Probe />
      </SessionProvider>
    </QueryClientProvider>,
  );
  return client;
}

const profileRow = (userId: string, onboarding_completed: boolean) => ({ user_id: userId, onboarding_completed });
const profileHandler = (rows: Record<string, unknown>) => (call: RecordedCall) => {
  if (call.kind === 'table' && call.name === 'profiles') {
    const eq = call.ops.find((o) => o.op === 'eq');
    return { data: rows[eq?.args[1] as string] ?? null };
  }
  return undefined;
};

beforeEach(() => AsyncStorage.clear());

it('restores to guest without a session', async () => {
  backend.reset(null);
  renderProvider();
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('guest'));
});

it('restores a persisted session and skips onboarding for completed profiles', async () => {
  backend.reset(makeSession('u1'), profileHandler({ u1: profileRow('u1', true) }));
  renderProvider();
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready:u1'));
});

it('routes incomplete profiles to needs_onboarding', async () => {
  backend.reset(makeSession('u1'), profileHandler({ u1: profileRow('u1', false) }));
  renderProvider();
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('needs_onboarding:u1'));
});

it('repairs a missing profile row for the signed-in user only', async () => {
  let repaired = false;
  const fake = backend.reset(makeSession('u1'), (call) => {
    if (call.name !== 'profiles') return undefined;
    if (call.ops.some((o) => o.op === 'upsert')) {
      repaired = true;
      return { data: null };
    }
    return { data: repaired ? profileRow('u1', false) : null };
  });
  renderProvider();
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('needs_onboarding:u1'));
  const upsert = fake.calls.find((c) => c.ops.some((o) => o.op === 'upsert'))!;
  const [payload] = upsert.ops.find((o) => o.op === 'upsert')!.args as [Record<string, unknown>];
  expect(payload.user_id).toBe('u1');
  expect(Object.keys(payload).sort()).toEqual(['display_name', 'user_id']);
});

it('shows a recoverable error when the profile cannot load', async () => {
  backend.reset(makeSession('u1'), () => ({ error: new Error('network down') }));
  renderProvider();
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('error'));
});

it('clears cached queries and private drafts when the account changes', async () => {
  const fake = backend.reset(makeSession('u1'), profileHandler({ u1: profileRow('u1', true), u2: profileRow('u2', true) }));
  const client = renderProvider();
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready:u1'));
  client.setQueryData(['account', 'u1', 'progress'], { xp: 50 });
  await AsyncStorage.setItem(storageKeys.onboardingDraft, '{"ownerUserId":"u1"}');

  await act(async () => fake.setSession(makeSession('u2')));
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready:u2'));
  expect(client.getQueryData(['account', 'u1', 'progress'])).toBeUndefined();
  expect(await AsyncStorage.getItem(storageKeys.onboardingDraft)).toBeNull();

  await act(async () => fake.setSession(null));
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('guest'));
});

it('keeps a guest draft when the guest signs in (onboarding adopts it explicitly)', async () => {
  const fake = backend.reset(null, profileHandler({ u1: profileRow('u1', false) }));
  renderProvider();
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('guest'));
  await AsyncStorage.setItem(storageKeys.onboardingDraft, '{"ownerUserId":null}');
  await act(async () => fake.setSession(makeSession('u1')));
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('needs_onboarding:u1'));
  expect(await AsyncStorage.getItem(storageKeys.onboardingDraft)).not.toBeNull();
});
