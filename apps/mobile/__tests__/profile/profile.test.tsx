import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { renderRouter, testRouter } from 'expo-router/testing-library';
import { Alert, Linking, type AlertButton } from 'react-native';
import { quest } from '../discovery/fixtures';
import { makeSession } from '../support/fakeSupabase';
import { installFakeSupabase } from '../support/mockBackend';
import { completionRow, makeDb, profileHandler, profileRow, progressRow, type ProfileDb } from './support';

// Profile + Settings route tests against a fake Supabase client. Mocked: they prove
// JS behaviour and the payloads that would be sent, not device or live-backend behaviour.
const backend = installFakeSupabase();
const { EditProfileForm } = require('../../src/features/profile/EditProfileForm') as typeof import('../../src/features/profile/EditProfileForm');

let db: ProfileDb;
const signedIn = (userId = 'u1') => backend.reset(makeSession(userId, `${userId}@example.test`), profileHandler(db));
const open = (url: string) => renderRouter('./src/app', { initialUrl: url });
const press = async (name: string | RegExp) => fireEvent.press(await screen.findByRole('button', { name }));
const toggle = async (name: string, value: boolean) => fireEvent(await screen.findByRole('switch', { name }), 'valueChange', value);
const enabledSwitch = async (name: string) => {
  await screen.findByRole('switch', { name }, { timeout: 5000 });
  await waitFor(() => expect(screen.getByRole('switch', { name })).toBeEnabled(), { timeout: 5000 });
};
const expectSwitch = (name: string, value: boolean) =>
  waitFor(() => expect(screen.getByRole('switch', { name }).props.value).toBe(value), { timeout: 3000 });
const switchValue = async (name: string) => (await screen.findByRole('switch', { name })).props.value as boolean;

/** Invokes the named button of the most recent Alert.alert. */
function alertPress(spy: jest.SpyInstance, text: string) {
  const buttons = spy.mock.calls[spy.mock.calls.length - 1][2] as AlertButton[];
  const button = buttons.find((b) => b.text === text);
  if (!button?.onPress) throw new Error(`No "${text}" button`);
  return button.onPress();
}

beforeEach(() => {
  jest.clearAllMocks(); // Linking is a shared jest mock; spies keep their calls between tests
  jest.restoreAllMocks();
  db = makeDb();
  db.profiles.u1 = profileRow('u1');
  db.progress.u1 = progressRow('u1');
});

describe('profile tab', () => {
  it('guest sees sign in / create account with a profile return', async () => {
    backend.reset(null, profileHandler(db));
    const rendered = await open('/profile');
    await fireEvent.press(await screen.findByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(rendered.getPathname()).toBe('/auth/sign-in'));
    expect(rendered.getSearchParams()).toEqual({ returnTo: 'tab:profile' });
  });

  it('guest can create an account with the same return', async () => {
    backend.reset(null, profileHandler(db));
    const rendered = await open('/profile');
    await press('Create account');
    await waitFor(() => expect(rendered.getPathname()).toBe('/auth/sign-up'));
    expect(rendered.getSearchParams()).toEqual({ returnTo: 'tab:profile' });
  });

  it('offers onboarding when it is not finished', async () => {
    db.profiles.u1 = profileRow('u1', { onboarding_completed: false });
    signedIn();
    const rendered = await open('/profile');
    await press('Finish setup');
    await waitFor(() => expect(rendered.getPathname()).toBe('/onboarding'));
    expect(rendered.getSearchParams()).toEqual({ returnTo: 'tab:profile' });
  });

  it('retries a failed profile load and offers sign out', async () => {
    let fail = true;
    const base = profileHandler(db);
    backend.reset(makeSession('u1'), (call) =>
      call.name === 'profiles' && !call.ops.some((o) => ['update', 'upsert'].includes(o.op)) && fail
        ? { error: { message: 'profile unavailable' } }
        : base(call),
    );
    await open('/profile');
    expect(await screen.findByText('Something went wrong loading your profile.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeVisible();
    fail = false;
    await press('Retry');
    expect(await screen.findByText('Ana Diaz')).toBeVisible();
  });

  it('shows identity, real progress and history, and opens a completed quest', async () => {
    db.completions.u1 = [completionRow('c1', 'q1', 'Mural Hunt'), completionRow('c2', 'q2', 'Taco Trail', { xp_awarded: 80, points_awarded: 20 })];
    db.quests.q1 = quest('q1', { title: 'Mural Hunt' });
    signedIn();
    const rendered = await open('/profile');

    expect(await screen.findByText('Ana Diaz')).toBeVisible();
    expect(screen.getByText('@ana')).toBeVisible();
    expect(screen.getByText('Miami')).toBeVisible();
    expect(screen.getByText('AD')).toBeVisible(); // initials, no avatar
    expect(await screen.findByLabelText('Level: 3')).toBeVisible();
    expect(screen.getByLabelText('XP, Progression: 340')).toBeVisible();
    expect(screen.getByLabelText('Points, Spendable: 125')).toBeVisible();
    expect(screen.getByText('Taco Trail')).toBeVisible();

    await fireEvent.press(screen.getByRole('button', { name: /^Mural Hunt/ }));
    await waitFor(() => expect(rendered.getPathname()).toBe('/quests/q1'));
  });

  it('shows "unavailable" (never zeroes) when the progress row is missing', async () => {
    db.progress.u1 = null;
    signedIn();
    await open('/profile');
    expect(await screen.findByText('Progress unavailable right now.')).toBeVisible();
    expect(screen.queryByLabelText(/^Level/)).toBeNull();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('shows "unavailable" with retry when progress fails to load', async () => {
    db.failProgress = true;
    signedIn();
    await open('/profile');
    // The query client retries once (1 s backoff) before reporting the failure.
    expect(await screen.findByText('Progress unavailable right now.', {}, { timeout: 5000 })).toBeVisible();
    db.failProgress = false;
    await press('Retry progress');
    expect(await screen.findByLabelText('Level: 3')).toBeVisible();
  });

  it('empty history points to Explore', async () => {
    signedIn();
    const rendered = await open('/profile');
    expect(await screen.findByText('No completed quests yet')).toBeVisible();
    await press('Explore quests');
    await waitFor(() => expect(rendered.getPathname()).toBe('/'));
  });

  it('never shows legacy profiles.xp/level/streak', async () => {
    db.profiles.u1 = profileRow('u1', { xp: 9999, level: 42, streak: 77 });
    signedIn();
    await open('/profile');
    await screen.findByLabelText('Level: 3');
    expect(screen.queryByText('9,999')).toBeNull();
    expect(screen.queryByText('9999')).toBeNull();
    expect(screen.queryByText('42')).toBeNull();
    expect(screen.queryByText('77')).toBeNull();
  });

  it('opens Settings from the gear button', async () => {
    signedIn();
    const rendered = await open('/profile');
    await press('Settings');
    await waitFor(() => expect(rendered.getPathname()).toBe('/settings'));
  });

  it('never shows one account\'s progress to the next account', async () => {
    db.progress.u2 = progressRow('u2', { xp: 777, level: 9, points_balance_cache: 5 });
    db.profiles.u2 = profileRow('u2', { display_name: 'Bo Lee' });
    const fake = signedIn('u1');
    await open('/profile');
    expect(await screen.findByLabelText('XP, Progression: 340')).toBeVisible();

    await inAct(() => fake.setSession(makeSession('u2', 'u2@example.test')));
    expect(await screen.findByLabelText('XP, Progression: 777')).toBeVisible();
    expect(screen.queryByLabelText('XP, Progression: 340')).toBeNull();
    expect(screen.queryByText('Ana Diaz')).toBeNull();
  });
});

async function inAct(fn: () => void) {
  await act(async () => fn());
}

describe('edit profile', () => {
  it('initialises from the loaded profile and keeps Save disabled until dirty and valid', async () => {
    signedIn();
    await open('/settings/edit-profile');
    expect(await screen.findByDisplayValue('Ana Diaz')).toBeVisible();
    expect(screen.getByDisplayValue('ana')).toBeVisible();
    expect(screen.getByDisplayValue('Hello')).toBeVisible();
    expect(screen.getByDisplayValue('Miami')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Display name'), 'Ana D');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
    await fireEvent.changeText(screen.getByLabelText('Display name'), '   ');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(screen.getByText('Enter a display name.')).toBeVisible();
    await fireEvent.changeText(screen.getByLabelText('Display name'), 'Ana Diaz');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled(); // back to loaded value

    await fireEvent.changeText(screen.getByLabelText('Username'), 'a!');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('preserves unsaved edits when the loaded profile refetches', async () => {
    const onSubmit = jest.fn(async () => undefined);
    const base = profileRow('u1') as never;
    const view = await render(<EditProfileForm profile={base} onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByLabelText('Display name'), 'Typed Name');

    // A refetch brings a changed bio and a changed display name from the server.
    await view.rerender(<EditProfileForm profile={{ ...(base as object), display_name: 'Server Name', bio: 'Server bio' } as never} onSubmit={onSubmit} />);
    expect(screen.getByDisplayValue('Typed Name')).toBeVisible(); // not clobbered
    expect(screen.getByDisplayValue('Server bio')).toBeVisible(); // untouched fields follow the server
  });

  it('writes only the changed editable columns for the signed-in user and refreshes on success', async () => {
    signedIn();
    await open('/settings/edit-profile');
    await fireEvent.changeText(await screen.findByLabelText('Display name'), '  Ana D  ');
    await fireEvent.changeText(screen.getByLabelText('Home city'), '');
    const reads = db.profileReads;
    await press('Save changes');
    expect(await screen.findByText('Profile saved.')).toBeVisible();

    expect(db.writes).toHaveLength(1);
    const [write] = db.writes;
    expect(write.table).toBe('profiles');
    expect(write.op).toBe('update');
    expect(write.payload).toEqual({ display_name: 'Ana D', home_city: null });
    expect(write.eq).toEqual(['user_id', 'u1']);
    // Consent / onboarding / progression columns are never part of a profile write.
    expect(Object.keys(write.payload).some((k) => /terms|privacy|accepted|marketing|onboarding|xp|level|streak/.test(k))).toBe(false);
    expect(db.profileReads).toBeGreaterThan(reads); // refreshProfile
    expect(screen.getByDisplayValue('Ana D')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('shows a rejected save, keeps the edits and does not refresh or report success', async () => {
    db.failWrite.profiles = { message: 'permission denied' };
    signedIn();
    await open('/settings/edit-profile');
    await fireEvent.changeText(await screen.findByLabelText('Bio'), 'New bio');
    const reads = db.profileReads;
    await press('Save changes');

    expect(await screen.findByText('permission denied')).toBeVisible();
    expect(screen.queryByText('Profile saved.')).toBeNull();
    expect(screen.getByDisplayValue('New bio')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
    expect(db.profileReads).toBe(reads);
  });

  it('maps a duplicate username to a friendly message and keeps the edit', async () => {
    db.failWrite.profiles = { code: '23505', message: 'duplicate key value violates unique constraint "profiles_username_key"' };
    signedIn();
    await open('/settings/edit-profile');
    await fireEvent.changeText(await screen.findByLabelText('Username'), 'taken_name');
    await press('Save changes');
    expect(await screen.findByText('That username is already taken.')).toBeVisible();
    expect(screen.queryByText(/duplicate key/)).toBeNull();
    expect(screen.getByDisplayValue('taken_name')).toBeVisible();
  });
});

describe('settings privacy', () => {
  it('shows the read-only account email', async () => {
    signedIn();
    await open('/settings');
    expect(await screen.findByLabelText('Email: u1@example.test')).toBeVisible();
  });

  it('toggles public profile optimistically, writing only is_public for the own row', async () => {
    signedIn();
    await open('/settings');
    expect(await switchValue('Public profile')).toBe(false);
    await toggle('Public profile', true);
    await waitFor(() => expect(db.writes).toHaveLength(1));
    expect(db.writes[0]).toMatchObject({ table: 'profiles', op: 'update', payload: { is_public: true }, eq: ['user_id', 'u1'] });
    await expectSwitch('Public profile', true);
  });

  it('rolls a rejected profile toggle back and shows the error', async () => {
    db.failWrite.profiles = { message: 'write rejected' };
    signedIn();
    await open('/settings');
    await toggle('Show completed quests', false);
    expect(await screen.findByText('write rejected')).toBeVisible();
    await expectSwitch('Show completed quests', true);
  });

  it('marketing toggle writes privacy_preferences and appends a consent event, creating the row on first change', async () => {
    signedIn();
    await open('/settings');
    expect(await switchValue('Marketing emails')).toBe(false);
    await enabledSwitch('Marketing emails');
    await toggle('Marketing emails', true);
    await waitFor(() => expect(db.writes).toHaveLength(2));

    expect(db.writes[0]).toMatchObject({ table: 'privacy_preferences', op: 'upsert', payload: { user_id: 'u1', marketing_consent: true } });
    expect(db.writes[1]).toMatchObject({
      table: 'consent_events',
      op: 'insert',
      payload: { user_id: 'u1', consent_type: 'marketing', granted: true, source: 'mobile_settings' },
    });
    // profiles.marketing_opt_in (signup snapshot) is never written.
    expect(db.writes.some((w) => w.table === 'profiles')).toBe(false);
    await expectSwitch('Marketing emails', true);
  });

  it('rolls the marketing switch back when the preference write fails, with no consent event', async () => {
    db.failWrite.privacy_preferences = { message: 'cannot save' };
    signedIn();
    await open('/settings');
    await enabledSwitch('Marketing emails');
    await toggle('Marketing emails', true);
    expect(await screen.findByText('cannot save')).toBeVisible();
    await expectSwitch('Marketing emails', false);
    expect(db.writes.some((w) => w.table === 'consent_events')).toBe(false);
  });

  it('reverts the preference when the consent event cannot be recorded', async () => {
    db.privacy.u1 = { user_id: 'u1', marketing_consent: false, leaderboard_visibility: 'public' };
    db.failWrite.consent_events = { message: 'log failed' };
    signedIn();
    await open('/settings');
    await enabledSwitch('Marketing emails');
    await toggle('Marketing emails', true);
    expect(await screen.findByText('log failed')).toBeVisible();
    await waitFor(() => expect(db.privacy.u1?.marketing_consent).toBe(false));
    await expectSwitch('Marketing emails', false);
  });

  it('leaderboard visibility writes the own privacy row', async () => {
    db.privacy.u1 = { user_id: 'u1', marketing_consent: false, leaderboard_visibility: 'public' };
    signedIn();
    await open('/settings');
    await enabledSwitch('Show me on leaderboards');
    expect(await switchValue('Show me on leaderboards')).toBe(true);
    await toggle('Show me on leaderboards', false);
    await waitFor(() => expect(db.writes).toHaveLength(1));
    expect(db.writes[0].payload).toEqual({ user_id: 'u1', leaderboard_visibility: 'private' });
  });
});

describe('settings actions', () => {
  it('Change password goes to the recovery flow', async () => {
    signedIn();
    const rendered = await open('/settings');
    await press('Change password');
    await waitFor(() => expect(rendered.getPathname()).toBe('/auth/forgot-password'));
  });

  it('permissions help opens device settings and says nothing about consent changing', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    signedIn();
    await open('/settings');
    expect(await screen.findByText(/only when you use Near me/)).toBeVisible();
    await press('Location & camera permissions');
    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('switch', { name: /location/i })).toBeNull();
  });

  it('legal links open https policy pages', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    signedIn();
    await open('/settings');
    await fireEvent.press(await screen.findByRole('link', { name: 'Terms of Service' }));
    expect(openURL).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/.+\/terms$/));
  });

  it('asks before signing out, then lands on Explore as a guest with no cached account data', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    signedIn();
    const rendered = await open('/profile');
    expect(await screen.findByLabelText('XP, Progression: 340')).toBeVisible();
    await press('Settings');
    await press('Sign out');
    expect(alert).toHaveBeenCalledTimes(1);
    expect(backend.fake.client.auth.signOut).not.toHaveBeenCalled();

    await inAct(() => void alertPress(alert, 'Sign out'));
    await waitFor(() => expect(rendered.getPathname()).toBe('/'));
    expect(backend.fake.client.auth.signOut).toHaveBeenCalledTimes(1);

    await testRouter.navigate('/profile');
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeVisible();
    expect(screen.queryByLabelText('XP, Progression: 340')).toBeNull();
  });

  it('cancelling the sign-out confirmation keeps the session', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    signedIn();
    await open('/settings');
    await press('Sign out');
    expect(alert).toHaveBeenCalledTimes(1);
    expect(backend.fake.client.auth.signOut).not.toHaveBeenCalled();
  });
});

describe('delete account', () => {
  async function toDeleteScreen() {
    const rendered = await open('/settings');
    await press('Delete account');
    await waitFor(() => expect(rendered.getPathname()).toBe('/settings/delete-account'));
    return rendered;
  }

  it('explains the process and does nothing until confirmed', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    signedIn();
    await toDeleteScreen();
    expect(await screen.findByText('What gets deleted')).toBeVisible();
    expect(screen.getByText(/within 30 days/)).toBeVisible();
    await press('Request deletion by email');
    expect(alert).toHaveBeenCalledTimes(1);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('opens a prefilled mailto after confirmation and never claims the account is deleted', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    signedIn();
    await toDeleteScreen();
    await press('Request deletion by email');
    await inAct(() => void alertPress(alert, 'Open email'));

    await waitFor(() => expect(openURL).toHaveBeenCalledTimes(1));
    const url = openURL.mock.calls[0][0];
    expect(url.startsWith('mailto:support@')).toBe(true);
    const query = new URLSearchParams(url.split('?')[1]);
    expect(query.get('subject')).toBe('Account Deletion Request');
    expect(query.get('body')).toContain('u1@example.test');
    expect(query.get('body')).toContain('User ID: u1');

    expect(await screen.findByText(/only sent once you send that email/)).toBeVisible();
    expect(screen.queryByText(/has been deleted|was deleted|deleted successfully/i)).toBeNull();
    // Still signed in; nothing was written to the backend.
    expect(backend.fake.client.auth.signOut).not.toHaveBeenCalled();
    expect(db.writes).toHaveLength(0);
  });

  it('shows the address when no email app can open, without pretending anything was sent', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    signedIn();
    await toDeleteScreen();
    await press('Request deletion by email');
    await inAct(() => void alertPress(alert, 'Open email'));

    expect(await screen.findByText(/could not open an email app/)).toBeVisible();
    expect(screen.getByText(/To: support@/)).toBeVisible();
    expect(screen.getByText('Subject: Account Deletion Request')).toBeVisible();
    expect(screen.getByText(/Nothing has been requested yet/)).toBeVisible();
    expect(openURL).not.toHaveBeenCalled();
  });
});
