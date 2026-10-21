import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { makeSession } from '../support/fakeSupabase';
import { installFakeSupabase } from '../support/mockBackend';
import { dbHandler, expectPath, makeDb, press, profile, type, type FakeDb } from './support';

// Regressions for node G review findings 1, 2 and 5 (mocked backend).
const backend = installFakeSupabase();
const { loadPendingReturn, savePendingReturn } = require('../../src/lib/navigation/returnTo') as typeof import('../../src/lib/navigation/returnTo');
const { resolveBackend, PRODUCTION_PROJECT_REF } = require('../../src/lib/config') as typeof import('../../src/lib/config');

let db: FakeDb;
const start = (session = null as ReturnType<typeof makeSession> | null) => backend.reset(session, dbHandler(db));
const open = (url: string) => renderRouter('./src/app', { initialUrl: url });

beforeEach(async () => {
  jest.restoreAllMocks();
  db = makeDb();
  await AsyncStorage.clear();
});

it('G1: an invalid recovery link never opens reset-password for an already signed-in account', async () => {
  db.profiles['user-A'] = profile('user-A', true);
  const fake = start(makeSession('user-A'));
  (fake.client.auth.exchangeCodeForSession as jest.Mock).mockResolvedValue({
    data: { session: null },
    error: { code: 'flow_state_not_found', message: 'invalid flow state', status: 404 },
  });
  const rendered = await open('/auth/callback?code=stale-code&flow=recovery');
  expect(await screen.findByText('Reset link not valid')).toBeVisible();
  expect(rendered.getPathname()).toBe('/auth/callback');
  expect(screen.queryByLabelText('New password')).toBeNull();
});

it('G1: an expired signup link while already signed in just forwards home (no state change, no loop)', async () => {
  db.profiles['user-A'] = profile('user-A', true);
  const fake = start(makeSession('user-A'));
  (fake.client.auth.exchangeCodeForSession as jest.Mock).mockResolvedValue({
    data: { session: null },
    error: { code: 'otp_expired', message: 'expired', status: 403 },
  });
  const rendered = await open('/auth/callback?code=old-code&flow=signup');
  await expectPath(rendered, '/');
  expect(fake.client.auth.updateUser).not.toHaveBeenCalled();
});

it('G2: recovery clears a pending quest return; onboarding after a reset never resumes the quest', async () => {
  db.profiles.u1 = profile('u1', false);
  await savePendingReturn({ kind: 'quest', questId: 'q-pending' });
  const fake = start(null);
  (fake.client.auth.exchangeCodeForSession as jest.Mock).mockImplementation(async () => {
    const session = makeSession('u1');
    fake.setSession(session);
    return { data: { session, user: session.user }, error: null };
  });
  const rendered = await open('/auth/callback?code=rec-code&flow=recovery');
  await expectPath(rendered, '/auth/reset-password');
  expect(await loadPendingReturn()).toBeNull();

  await waitFor(() => expect(screen.getByLabelText('New password')).toBeVisible());
  await type('New password', 'longer-pass');
  await type('Confirm new password', 'longer-pass');
  await press('Update password');
  await expectPath(rendered, '/onboarding');
  await press('Skip for now');
  await expectPath(rendered, '/');
});

it('G5: the production project is refused even with a trailing-dot or mixed-case hostname', () => {
  expect(resolveBackend(`https://${PRODUCTION_PROJECT_REF}.supabase.co.`, 'key').status).toBe('refused');
  expect(resolveBackend(`https://${PRODUCTION_PROJECT_REF.toUpperCase()}.SUPABASE.CO`, 'key').status).toBe('refused');
});
