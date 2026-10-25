import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter, testRouter } from 'expo-router/testing-library';
import { makeSession } from '../support/fakeSupabase';
import { installFakeSupabase } from '../support/mockBackend';
import { dbHandler, expectPath, makeDb, press, profile, quest, type, type FakeDb } from './support';

const backend = installFakeSupabase();
const { storageKeys } = require('../../src/lib/appStorage') as typeof import('../../src/lib/appStorage');
const { loadPendingReturn, savePendingReturn } = require('../../src/lib/navigation/returnTo') as typeof import('../../src/lib/navigation/returnTo');

let db: FakeDb;
const start = (session = null as ReturnType<typeof makeSession> | null) => backend.reset(session, dbHandler(db));
const open = (url: string) => renderRouter('./src/app', { initialUrl: url });
const draftOf = async () => JSON.parse((await AsyncStorage.getItem(storageKeys.onboardingDraft)) ?? 'null');
/**
 * Synchronous read of the mocked AsyncStorage, for use inside waitFor. An async
 * expectation lets waitFor resolve while its act(advanceTimersByTimeAsync) is
 * still open; that act then outlives the test and stops later act() scopes in
 * this file from flushing.
 */
const draftNow = () =>
  JSON.parse(
    (AsyncStorage as unknown as { __INTERNAL_MOCK_STORAGE__: Record<string, string> }).__INTERNAL_MOCK_STORAGE__[
      storageKeys.onboardingDraft
    ] ?? 'null',
  );

beforeEach(async () => {
  jest.restoreAllMocks();
  db = makeDb();
  await AsyncStorage.clear();
});

/** Signing in/confirming creates this session on the fake client (emits SIGNED_IN). */
function signsInAs(userId: string, fake: ReturnType<typeof start>, method: 'signInWithPassword' | 'exchangeCodeForSession') {
  (fake.client.auth[method] as jest.Mock).mockImplementation(async () => {
    const session = makeSession(userId);
    fake.setSession(session);
    return { data: { session, user: session.user }, error: null };
  });
}

async function walkOnboarding() {
  await press('Start exploring');
  await press('Foodie');
  await press('Continue');
  await fireEvent.press(screen.getByRole('radio', { name: /Relaxed Explorer/ }));
  await press('Continue');
  await press('Wynwood');
  await press('Continue');
  await press('Continue');
}

describe('sign-up through onboarding to the intended quest', () => {
  it('guest -> sign-up -> verify -> callback -> onboarding -> quest', async () => {
    db.profiles.u1 = profile('u1', false);
    const fake = start(null);
    signsInAs('u1', fake, 'exchangeCodeForSession');
    const rendered = await open('/auth/sign-up?returnTo=quest:q1');
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeVisible());

    // Consent: both unchecked, signup blocked until the terms are accepted.
    const terms = () => screen.getByRole('checkbox', { name: /Terms of Service and Privacy Policy/ });
    const marketing = () => screen.getByRole('checkbox', { name: /emails about quests/ });
    expect(terms()).not.toBeChecked();
    expect(marketing()).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();

    await type('Display name (optional)', ' Ana ');
    await type('Email', 'ana@example.test ');
    await type('Password', 'hunter22');
    await press('Create account');
    expect(fake.client.auth.signUp).not.toHaveBeenCalled();
    expect(await screen.findByText(/agree to the Terms of Service and Privacy Policy to continue/)).toBeVisible();

    await fireEvent.press(terms());
    expect(terms()).toBeChecked();
    expect(marketing()).not.toBeChecked();
    await press('Create account');
    await expectPath(rendered, '/auth/verify-email');

    expect(fake.client.auth.signUp).toHaveBeenCalledTimes(1);
    const [arg] = (fake.client.auth.signUp as jest.Mock).mock.calls[0];
    expect(arg).toEqual({
      email: 'ana@example.test',
      password: 'hunter22',
      options: {
        data: { display_name: 'Ana', terms_version: '1.0.0', privacy_version: '1.0.0', marketing_opt_in: false },
        emailRedirectTo: expect.stringContaining('/auth/callback'),
      },
    });
    // The destination survives confirmation and restart; the password is never persisted.
    expect(await loadPendingReturn()).toEqual({ kind: 'quest', questId: 'q1' });
    const stored = JSON.stringify(await AsyncStorage.getAllKeys().then((k) => AsyncStorage.multiGet(k)));
    expect(stored).not.toContain('hunter22');

    expect(screen.getByText('Check your email')).toBeVisible();
    expect(screen.getByText(/Open it on this device/)).toBeVisible();
    expect(screen.getByText('Confirmed in a browser?')).toBeVisible();
    expect(screen.getByRole('button', { name: /Resend email \(\d+s\)/ })).toBeDisabled();

    // The confirmation link opens the app (the pending return carries the destination).
    await testRouter.push('/auth/callback?code=abc123&flow=signup');
    await waitFor(() => expect(fake.client.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc123'));
    await expectPath(rendered, '/onboarding');
    expect(rendered.getSearchParams()).toEqual({ returnTo: 'quest:q1' });

    await walkOnboarding();
    expect(await screen.findByText('You’re all set.')).toBeVisible();
    await press('Save and start exploring');
    await expectPath(rendered, '/quests/q1');

    // Saved with only the onboarding columns, then the draft and pending return are cleared.
    expect(db.upserts).toHaveLength(1);
    expect(db.upserts[0]).toEqual({
      user_id: 'u1',
      interests: ['foodie'],
      quest_style: 'relaxed',
      quest_energy: 'chill',
      starting_area: 'wynwood',
      onboarding_completed: true,
    });
    expect(await AsyncStorage.getItem(storageKeys.onboardingDraft)).toBeNull();
    expect(await loadPendingReturn()).toBeNull();
  });

  it('records the marketing opt-in only when the user ticks it', async () => {
    const fake = start(null);
    await open('/auth/sign-up');
    await press('Create account'); // disabled; nothing happens
    await fireEvent.press(await screen.findByRole('checkbox', { name: /Terms of Service/ }));
    await fireEvent.press(screen.getByRole('checkbox', { name: /emails about quests/ }));
    await type('Email', 'a@b.co');
    await type('Password', 'abcdef');
    await press('Create account');
    await waitFor(() => expect(fake.client.auth.signUp).toHaveBeenCalled());
    const [arg] = (fake.client.auth.signUp as jest.Mock).mock.calls[0];
    expect(arg.options.data).toEqual({ terms_version: '1.0.0', privacy_version: '1.0.0', marketing_opt_in: true });
  });

  it('maps an existing account to a sign-in hint and keeps the pending return clean', async () => {
    const fake = start(null);
    (fake.client.auth.signUp as jest.Mock).mockResolvedValueOnce({ data: { user: { identities: [] }, session: null }, error: null });
    await open('/auth/sign-up?returnTo=quest:q1');
    await fireEvent.press(await screen.findByRole('checkbox', { name: /Terms of Service/ }));
    await type('Email', 'a@b.co');
    await type('Password', 'abcdef');
    await press('Create account');
    expect(await screen.findByText(/may already exist/)).toBeVisible();
    expect(await loadPendingReturn()).toBeNull();
  });
});

describe('sign-in', () => {
  it('returns a completed user to the quest and never shows onboarding', async () => {
    db.profiles.u2 = profile('u2', true);
    const fake = start(null);
    signsInAs('u2', fake, 'signInWithPassword');
    const rendered = await open('/auth/sign-in?returnTo=quest:q9');
    await type('Email', 'back@example.test');
    await type('Password', 'secret1');
    await press('Sign in');
    await expectPath(rendered, '/quests/q9');
    expect(db.upserts).toHaveLength(0);
    expect(fake.client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'back@example.test', password: 'secret1' });
  });

  it('forwards a signed-in user instead of looping on the sign-in screen', async () => {
    db.profiles.u2 = profile('u2', true);
    start(makeSession('u2'));
    const rendered = await open('/auth/sign-in?returnTo=quest:q9');
    await expectPath(rendered, '/quests/q9');
  });

  it('sends a signed-in user with an unfinished profile to onboarding with the same destination', async () => {
    db.profiles.u3 = profile('u3', false);
    start(makeSession('u3'));
    const rendered = await open('/auth/sign-in?returnTo=quest:q4');
    await expectPath(rendered, '/onboarding');
    expect(rendered.getSearchParams()).toEqual({ returnTo: 'quest:q4' });
  });

  it('uses the pending return when the URL has none', async () => {
    db.profiles.u2 = profile('u2', true);
    await savePendingReturn({ kind: 'quest', questId: 'pending-1' });
    start(makeSession('u2'));
    const rendered = await open('/auth/sign-in');
    await expectPath(rendered, '/quests/pending-1');
    expect(await loadPendingReturn()).toBeNull();
  });

  it.each(['quest:../x', 'quest:a:b', 'tab:admin', 'https://evil.test'])('ignores a tampered returnTo (%s) and lands on Explore', async (bad) => {
    db.profiles.u2 = profile('u2', true);
    start(makeSession('u2'));
    const rendered = await open(`/auth/sign-in?returnTo=${encodeURIComponent(bad)}`);
    await expectPath(rendered, '/');
  });

  it('shows a mapped error and offers a resend for an unconfirmed email', async () => {
    const fake = start(null);
    (fake.client.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
      data: {},
      error: { code: 'email_not_confirmed', message: 'Email not confirmed', status: 400 },
    });
    const rendered = await open('/auth/sign-in?returnTo=quest:q1');
    await type('Email', 'new@example.test');
    await type('Password', 'secret1');
    await press('Sign in');
    expect(await screen.findByText(/Confirm your email first/)).toBeVisible();
    await press('Resend confirmation email');
    await expectPath(rendered, '/auth/verify-email');
    expect(fake.client.auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'new@example.test',
      options: { emailRedirectTo: expect.stringContaining('/auth/callback') },
    });
    expect(await loadPendingReturn()).toEqual({ kind: 'quest', questId: 'q1' });
  });

  it('shows invalid-credential and network errors without echoing server text', async () => {
    const fake = start(null);
    (fake.client.auth.signInWithPassword as jest.Mock)
      .mockResolvedValueOnce({ data: {}, error: { code: 'invalid_credentials', message: 'raw server text', status: 400 } })
      .mockRejectedValueOnce(Object.assign(new Error('Failed to fetch'), { name: 'AuthRetryableFetchError' }));
    await open('/auth/sign-in');
    await type('Email', 'x@example.test');
    await type('Password', 'wrong');
    await press('Sign in');
    expect(await screen.findByText(/email and password do not match/)).toBeVisible();
    expect(screen.queryByText(/raw server text/)).toBeNull();
    await press('Sign in');
    expect(await screen.findByText(/could not reach SideQuests/)).toBeVisible();
  });

  it('offers retry when the profile cannot be loaded', async () => {
    db.failProfileReads = true;
    db.profiles.u2 = profile('u2', true);
    start(makeSession('u2'));
    const rendered = await open('/auth/sign-in?returnTo=quest:q9');
    expect(await screen.findByText('We could not load your profile')).toBeVisible();
    db.failProfileReads = false;
    await press('Try again');
    await expectPath(rendered, '/quests/q9');
  });
});

describe('password recovery', () => {
  it('shows the same neutral confirmation however the server answers', async () => {
    const fake = start(null);
    (fake.client.auth.resetPasswordForEmail as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'User not found', status: 400 } });
    await open('/auth/forgot-password');
    await type('Email', 'nobody@example.test');
    await press('Send reset link');
    const neutral = /If an account exists for that email, we sent a link/;
    expect(await screen.findByText(neutral)).toBeVisible();
    expect(fake.client.auth.resetPasswordForEmail).toHaveBeenCalledWith('nobody@example.test', {
      redirectTo: expect.stringContaining('/auth/callback'),
    });
  });

  it('reports connection problems instead of a false confirmation', async () => {
    const fake = start(null);
    (fake.client.auth.resetPasswordForEmail as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'Failed to fetch', status: 0 } });
    await open('/auth/forgot-password');
    await type('Email', 'a@b.co');
    await press('Send reset link');
    expect(await screen.findByText(/could not reach SideQuests/)).toBeVisible();
    expect(screen.queryByText(/If an account exists/)).toBeNull();
  });

  it('recovery callback goes to reset-password, never to a pending quest', async () => {
    db.profiles.u1 = profile('u1', true);
    await savePendingReturn({ kind: 'quest', questId: 'q1' });
    const fake = start(null);
    signsInAs('u1', fake, 'exchangeCodeForSession');
    const rendered = await open('/auth/callback?code=rec-code&flow=recovery');
    await expectPath(rendered, '/auth/reset-password');
    await waitFor(() => expect(screen.getByLabelText('New password')).toBeVisible());
    // renderRouter fakes timers: let any (wrongly) pending redirect fire.
    await act(async () => void jest.advanceTimersByTime(1000));
    expect(rendered.getPathname()).toBe('/auth/reset-password');
  });

  it('updates the password with a recovery session and lands on Explore', async () => {
    db.profiles.u1 = profile('u1', true);
    const fake = start(makeSession('u1'));
    const rendered = await open('/auth/reset-password');
    await type('New password', 'longer-pass');
    await type('Confirm new password', 'different');
    await press('Update password');
    expect(await screen.findByText('Passwords do not match.')).toBeVisible();
    expect(fake.client.auth.updateUser).not.toHaveBeenCalled();
    await type('Confirm new password', 'longer-pass');
    await press('Update password');
    await expectPath(rendered, '/');
    expect(fake.client.auth.updateUser).toHaveBeenCalledWith({ password: 'longer-pass' });
  });

  it('asks for a new link when there is no recovery session', async () => {
    start(null);
    const rendered = await open('/auth/reset-password');
    expect(await screen.findByText('This link has expired')).toBeVisible();
    expect(screen.queryByLabelText('New password')).toBeNull();
    await press('Request a new link');
    await expectPath(rendered, '/auth/forgot-password');
  });
});

describe('callback failures', () => {
  it('shows a safe recovery screen for provider error params without exchanging anything', async () => {
    const fake = start(null);
    const rendered = await open(
      '/auth/callback?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&flow=signup',
    );
    expect(await screen.findByText('Confirmation link not valid')).toBeVisible();
    expect(screen.queryByText(/Email link is invalid/)).toBeNull();
    expect(fake.client.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    await press('Request a new link');
    await expectPath(rendered, '/auth/sign-in');
  });

  it('handles an expired or replayed code without looping', async () => {
    const fake = start(null);
    (fake.client.auth.exchangeCodeForSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: { code: 'flow_state_expired', message: 'invalid flow state, no valid flow state found', status: 400 },
    });
    const rendered = await open('/auth/callback?code=old-code&flow=recovery');
    expect(await screen.findByText('Reset link not valid')).toBeVisible();
    expect(rendered.getPathname()).toBe('/auth/callback');
    expect(fake.client.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
    await press('Request a new link');
    await expectPath(rendered, '/auth/forgot-password');
  });

  it('treats a callback with no code and no session as an invalid link', async () => {
    start(null);
    await open('/auth/callback?flow=signup');
    expect(await screen.findByText('Confirmation link not valid')).toBeVisible();
  });
});

describe('verify-email', () => {
  it('resends with the app redirect after the cooldown', async () => {
    const fake = start(null);
    await open('/auth/verify-email?email=ana%40example.test');
    expect(await screen.findByText(/ana@example.test/)).toBeVisible();
    for (let i = 0; i < 60; i += 1) await act(async () => void jest.advanceTimersByTime(1000));
    await press('Resend email');
    await waitFor(() =>
      expect(fake.client.auth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'ana@example.test',
        options: { emailRedirectTo: expect.stringContaining('/auth/callback') },
      }),
    );
    expect(await screen.findByRole('button', { name: /Resend email \(\d+s\)/ })).toBeDisabled();
  });
});

describe('onboarding', () => {
  it('writes the draft on every change, owned by the guest', async () => {
    start(null);
    await open('/onboarding');
    await press('Start exploring');
    await press('Foodie');
    await press('Continue');
    expect(await screen.findByText('What kind of explorer are you?')).toBeVisible();
    await waitFor(() => expect(draftNow()?.step).toBe(3));
    expect(await draftOf()).toMatchObject({ ownerUserId: null, step: 3, selections: { vibes: ['foodie'] } });
  });

  it('restores an interrupted draft after a restart (fresh mount reading storage)', async () => {
    await AsyncStorage.setItem(
      storageKeys.onboardingDraft,
      JSON.stringify({ ownerUserId: null, step: 3, selections: { vibes: ['foodie'], explorerStyle: null, neighborhood: null }, updatedAt: 1 }),
    );
    start(null);
    await open('/onboarding');
    expect(await screen.findByText('What kind of explorer are you?')).toBeVisible();
    await press('Go back');
    expect(await screen.findByRole('button', { name: 'Foodie' })).toBeSelected();
  });

  it('lets a guest keep browsing to the return destination, keeping the draft', async () => {
    start(null);
    const rendered = await open('/onboarding?returnTo=quest:q7');
    await press('Start exploring');
    await press('Foodie');
    await press('Continue');
    await press('Skip for now');
    await expectPath(rendered, '/quests/q7');
    expect(await draftOf()).toMatchObject({ step: 3 });
  });

  it('gives a guest the account step with the return destination preserved', async () => {
    await AsyncStorage.setItem(
      storageKeys.onboardingDraft,
      JSON.stringify({ ownerUserId: null, step: 6, selections: { vibes: ['foodie'], explorerStyle: 'social', neighborhood: 'wynwood' }, updatedAt: 1 }),
    );
    start(null);
    const rendered = await open('/onboarding?returnTo=quest:q7');
    expect(await screen.findByText('Save your adventure')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Keep browsing' })).toBeVisible();
    await press('Create account to save');
    await expectPath(rendered, '/auth/sign-up');
    expect(rendered.getSearchParams()).toEqual({ returnTo: 'quest:q7' });
  });

  it('adopts a guest draft for the account that completes onboarding', async () => {
    db.profiles.u1 = profile('u1', false);
    await AsyncStorage.setItem(
      storageKeys.onboardingDraft,
      JSON.stringify({ ownerUserId: null, step: 6, selections: { vibes: ['nightlife'], explorerStyle: 'chaos', neighborhood: 'brickell' }, updatedAt: 1 }),
    );
    start(makeSession('u1'));
    const rendered = await open('/onboarding');
    await press('Save and start exploring');
    await expectPath(rendered, '/');
    expect(db.upserts[0]).toMatchObject({ user_id: 'u1', interests: ['nightlife'], quest_style: 'chaos', quest_energy: 'chaotic-good', starting_area: 'brickell' });
  });

  it('discards a draft owned by another user', async () => {
    db.profiles.u1 = profile('u1', false);
    await AsyncStorage.setItem(
      storageKeys.onboardingDraft,
      JSON.stringify({ ownerUserId: 'other', step: 6, selections: { vibes: ['foodie'], explorerStyle: 'social', neighborhood: 'wynwood' }, updatedAt: 1 }),
    );
    start(makeSession('u1'));
    await open('/onboarding');
    expect(await screen.findByText('The city is full of hidden adventures.')).toBeVisible();
    expect(await AsyncStorage.getItem(storageKeys.onboardingDraft)).toBeNull();
  });

  it('forwards a completed user away from onboarding and never applies a draft to them', async () => {
    db.profiles.u1 = profile('u1', true);
    await AsyncStorage.setItem(
      storageKeys.onboardingDraft,
      JSON.stringify({ ownerUserId: null, step: 6, selections: { vibes: ['foodie'], explorerStyle: 'social', neighborhood: 'wynwood' }, updatedAt: 1 }),
    );
    start(makeSession('u1'));
    const rendered = await open('/onboarding?returnTo=quest:q2');
    await expectPath(rendered, '/quests/q2');
    expect(db.upserts).toHaveLength(0);
  });

  it('sends a completed user without a destination to Explore', async () => {
    db.profiles.u1 = profile('u1', true);
    start(makeSession('u1'));
    const rendered = await open('/onboarding');
    await expectPath(rendered, '/');
  });

  it('keeps the draft, shows retry and does not mark complete when saving fails', async () => {
    db.profiles.u1 = profile('u1', false);
    db.failUpsert = true;
    await AsyncStorage.setItem(
      storageKeys.onboardingDraft,
      JSON.stringify({ ownerUserId: 'u1', step: 6, selections: { vibes: ['foodie'], explorerStyle: 'social', neighborhood: 'wynwood' }, updatedAt: 1 }),
    );
    start(makeSession('u1'));
    const rendered = await open('/onboarding');
    await press('Save and start exploring');
    expect(await screen.findByText(/could not save your picks/)).toBeVisible();
    expect(rendered.getPathname()).toBe('/onboarding');
    expect(db.profiles.u1?.onboarding_completed).toBe(false);
    expect(await draftOf()).toMatchObject({ ownerUserId: 'u1', step: 6 });

    db.failUpsert = false;
    await press('Try again');
    await expectPath(rendered, '/');
    expect(db.profiles.u1?.onboarding_completed).toBe(true);
    expect(Object.keys(db.upserts[0]).sort()).toEqual(['interests', 'onboarding_completed', 'quest_energy', 'quest_style', 'starting_area', 'user_id']);
  });

  it('suggests real matching quests, and is honest when none match or loading fails', async () => {
    db.quests = [quest('fq', 'food', { title: 'Cafecito Crawl' }), quest('nq', 'nightlife')];
    start(null);
    const rendered = await open('/onboarding');
    await press('Start exploring');
    await press('Foodie');
    await press('Continue');
    await fireEvent.press(screen.getByRole('radio', { name: /Relaxed Explorer/ }));
    await press('Continue');
    await press('Wynwood');
    await press('Continue');
    expect(await screen.findByText('Cafecito Crawl')).toBeVisible();
    expect(screen.queryByText('Quest nq')).toBeNull();
    await press(/Cafecito Crawl/);
    await expectPath(rendered, '/quests/fq');

  });

  it('says so honestly when no quest matches the picks', async () => {
    db.quests = [quest('fq', 'food')];
    await AsyncStorage.setItem(
      storageKeys.onboardingDraft,
      JSON.stringify({ ownerUserId: null, step: 5, selections: { vibes: ['community'], explorerStyle: 'social', neighborhood: 'wynwood' }, updatedAt: 1 }),
    );
    start(null);
    await open('/onboarding');
    expect(await screen.findByText('No matching quests yet')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Browse all quests' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('does not block onboarding when quests fail to load', async () => {
    await AsyncStorage.setItem(
      storageKeys.onboardingDraft,
      JSON.stringify({ ownerUserId: null, step: 5, selections: { vibes: ['foodie'], explorerStyle: 'social', neighborhood: 'wynwood' }, updatedAt: 1 }),
    );
    const fake = start(null);
    fake.setHandler((call) => (call.name === 'quests' ? { error: { message: 'down' } } : undefined));
    await open('/onboarding');
    expect(await screen.findByText('No matching quests yet')).toBeVisible();
    expect(screen.getByText(/could not load quests/)).toBeVisible();
    await press('Continue');
    expect(await screen.findByText('Save your adventure')).toBeVisible();
  });
});
