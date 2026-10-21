import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { storageKeys } from '../../src/lib/appStorage';
import { makeSession } from '../support/fakeSupabase';
import { installFakeSupabase } from '../support/mockBackend';
import { completeOk, completionRow, makeWorld, QUEST_ID, rpcCalls, scanOk, scanPayload, worldHandler, type World } from './support';

// Quest loop with a mocked backend and mocked camera: proves JS state/wiring only,
// not device camera behaviour or live backend behaviour.
const backend = installFakeSupabase();
const cameraMock = jest.requireMock('expo-camera').useCameraPermissions as jest.Mock;
const GOOD = 'https://miamisidequests.io/scan/ABCD1234';
const COMPLETE_URL = `/quests/${QUEST_ID}/complete`;

const grantCamera = () => cameraMock.mockReturnValue([{ granted: true, canAskAgain: true, status: 'granted' }, jest.fn()]);

let world: World;
async function mount(opts: { session?: boolean; url?: string } = {}) {
  backend.reset(opts.session === false ? null : makeSession(world.userId), worldHandler(world));
  return renderRouter('./src/app', { initialUrl: opts.url ?? COMPLETE_URL });
}

async function openCamera() {
  await fireEvent.press(await screen.findByRole('button', { name: 'Scan the SideQuests code' }, { timeout: 8000 }));
  await screen.findByTestId('camera-view');
}

async function scanGood() {
  await openCamera();
  await scanPayload(GOOD);
  await screen.findByText('Scan verified — not completed yet');
}

const stored = async () => JSON.parse((await AsyncStorage.getItem(storageKeys.questLoop)) ?? 'null');

beforeEach(async () => {
  world = makeWorld();
  await AsyncStorage.clear();
  cameraMock.mockReset();
  cameraMock.mockReturnValue([{ granted: false, canAskAgain: true, status: 'undetermined' }, jest.fn()]);
});

describe('gate and routing', () => {
  it('redirects a guest deep link to sign-in with returnTo', async () => {
    const rendered = await mount({ session: false });
    await waitFor(() => expect(rendered.getPathname()).toBe('/auth/sign-in'));
    expect(rendered.getSearchParams()).toMatchObject({ returnTo: `quest:${QUEST_ID}` });
    expect(rpcCalls(world, 'record_code_scan')).toHaveLength(0);
  });

  it('shows an unsupported state for non-QR quests and never offers the scanner', async () => {
    await mount({ url: '/quests/q-gps/complete' });
    expect(await screen.findByText('Not supported in the app yet', {}, { timeout: 8000 })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Scan the SideQuests code' })).toBeNull();
  });

  it('rejects a malformed quest id', async () => {
    await mount({ url: '/quests/bad%20id!/complete' });
    expect(await screen.findByText('Quest not found', {}, { timeout: 8000 })).toBeVisible();
  });
});

describe('camera and scan verification', () => {
  it('explains denied camera access and opens settings, without requesting again when blocked', async () => {
    const request = jest.fn(async () => ({ granted: false, canAskAgain: false, status: 'denied' }));
    cameraMock.mockReturnValue([{ granted: false, canAskAgain: true, status: 'undetermined' }, request]);
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined as never);
    await mount();
    await fireEvent.press(await screen.findByRole('button', { name: 'Scan the SideQuests code' }, { timeout: 8000 }));
    expect(await screen.findByText('Camera access is off')).toBeVisible();
    expect(request).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Open settings' }));
    expect(openSettings).toHaveBeenCalled();
    expect(screen.queryByTestId('camera-view')).toBeNull();
    openSettings.mockRestore();
  });

  it('does not request permission before the Scan button is pressed', async () => {
    const request = jest.fn();
    cameraMock.mockReturnValue([{ granted: false, canAskAgain: true, status: 'undetermined' }, request]);
    await mount();
    await screen.findByRole('button', { name: 'Scan the SideQuests code' }, { timeout: 8000 });
    expect(request).not.toHaveBeenCalled();
  });

  it('rejects non-SideQuests payloads without calling the server', async () => {
    grantCamera();
    await mount();
    await openCamera();
    await scanPayload('https://evil.example/scan/ABCD1234');
    expect(await screen.findByText(/not a SideQuests quest code/)).toBeVisible();
    expect(rpcCalls(world, 'record_code_scan')).toHaveLength(0);
  });

  it('shows invalid_code from the server and lets the user scan again', async () => {
    grantCamera();
    world.scan = () => ({ data: { ok: false, error: 'invalid_code' } });
    await mount();
    await openCamera();
    await scanPayload(GOOD);
    expect(await screen.findByText(/not a SideQuests quest code/)).toBeVisible();
    expect(await stored()).toBeNull();
    expect(screen.getByRole('button', { name: 'Scan the SideQuests code' })).toBeVisible();
  });

  it('ignores extra frames while a scan is processed', async () => {
    grantCamera();
    await mount();
    await openCamera();
    await act(async () => {
      const onScan = screen.getByTestId('camera-view').props.onBarcodeScanned;
      onScan({ data: GOOD });
      onScan({ data: GOOD });
      onScan({ data: GOOD });
    });
    await screen.findByText('Scan verified — not completed yet');
    expect(rpcCalls(world, 'record_code_scan')).toHaveLength(1);
  });

  it('does not complete when the code belongs to a different quest, and offers to open it', async () => {
    grantCamera();
    world.scan = () => scanOk('other-quest', 'scan-x');
    const rendered = await mount();
    await openCamera();
    await scanPayload(GOOD);
    expect(await screen.findByText(/different quest/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Complete quest' })).toBeNull();
    expect(await stored()).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Open that quest' }));
    await waitFor(() => expect(rendered.getPathname()).toBe('/quests/other-quest'));
  });

  it('keeps the same code when verification fails on the network and retries it', async () => {
    grantCamera();
    let calls = 0;
    world.scan = () => (++calls === 1 ? { error: new Error('offline') } : scanOk());
    await mount();
    await openCamera();
    await scanPayload(GOOD);
    expect(await screen.findByText(/couldn't verify the code/)).toBeVisible();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('Scan verified — not completed yet');
    const scans = rpcCalls(world, 'record_code_scan');
    expect(scans).toHaveLength(2);
    expect(scans[1].params.p_code).toBe('ABCD1234');
  });

  it('sends the documented record_code_scan params', async () => {
    grantCamera();
    await mount();
    await openCamera();
    await scanPayload(GOOD);
    await screen.findByText('Scan verified — not completed yet');
    const [call] = rpcCalls(world, 'record_code_scan');
    expect(call.params).toMatchObject({
      p_code: 'ABCD1234',
      p_device_type: 'mobile',
      p_browser: null,
      p_referrer: null,
      p_operating_system: expect.any(String),
      p_anonymous_session_id: expect.any(String),
    });
  });
});

describe('completion', () => {
  it('sends exact params and shows server-awarded XP and Points only after ok:true', async () => {
    grantCamera();
    world.offer = () => ({ data: { ok: true, instance: { id: 'inst-1', objective: 'Strike a pose', prompt: 'By the mural', estimated_time: '5 min' } } });
    let release: (v: unknown) => void = () => undefined;
    world.complete = () => completeOk({ xpAwarded: 150, pointsAwarded: 60, leveledUp: true, newLevel: 3 });
    await mount();
    await scanGood();
    expect(screen.getByText('Strike a pose')).toBeVisible();
    // Nothing is shown as earned before the server confirms.
    expect(screen.queryByText(/\+\d+ XP/)).toBeNull();
    expect(screen.queryByText('Quest complete!')).toBeNull();
    void release;
    await fireEvent.press(screen.getByRole('button', { name: 'Complete quest' }));
    expect(await screen.findByText('Quest complete!')).toBeVisible();
    expect(screen.getByText(/\+150 XP/)).toBeVisible();
    expect(screen.getByText(/\+60 Points/)).toBeVisible();
    expect(screen.getByText(/reached level 3/)).toBeVisible();
    const calls = rpcCalls(world, 'complete_quest');
    expect(calls).toHaveLength(1);
    expect(calls[0].params).toEqual({
      p_quest_id: QUEST_ID,
      p_verification_method: 'qr',
      p_venue_code: null,
      p_source_scan_id: 'scan-1',
      p_instance_id: 'inst-1',
    });
    expect(await stored()).toEqual([]);
    expect(screen.getByRole('button', { name: 'Back to quest' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Explore more' })).toBeVisible();
  });

  it('omits p_instance_id when there is no instance', async () => {
    grantCamera();
    await mount();
    await scanGood();
    await fireEvent.press(screen.getByRole('button', { name: 'Complete quest' }));
    await screen.findByText('Quest complete!');
    expect(rpcCalls(world, 'complete_quest')[0].params).not.toHaveProperty('p_instance_id');
  });

  it('sends complete_quest once for a double tap while the first call is in flight', async () => {
    grantCamera();
    await mount();
    await scanGood();
    const rpc = backend.fake.client.rpc as jest.Mock;
    const original = rpc.getMockImplementation() as (name: string, params?: unknown) => unknown;
    let finish: (v: unknown) => void = () => undefined;
    let sent = 0;
    rpc.mockImplementation((name: string, params?: unknown) => {
      if (name !== 'complete_quest') return original(name, params);
      sent += 1;
      return new Promise((resolve) => {
        finish = resolve;
      });
    });
    const button = screen.getByRole('button', { name: 'Complete quest' });
    await fireEvent.press(button);
    await fireEvent.press(button);
    await fireEvent.press(button);
    expect(sent).toBe(1);
    expect(screen.queryByText('Quest complete!')).toBeNull();
    await act(async () => {
      finish({ data: completeOk().data, error: null });
    });
    expect(await screen.findByText('Quest complete!')).toBeVisible();
    expect(sent).toBe(1);
  });

  it('after a network error, shows completion from server data when it exists (no duplicate call)', async () => {
    grantCamera();
    world.complete = () => ({ error: new Error('network lost') });
    await mount();
    await scanGood();
    // The server actually recorded it before the response was lost.
    world.completions = [completionRow({ xp_awarded: 99, points_awarded: 33, source_scan_id: 'scan-1' })];
    await fireEvent.press(screen.getByRole('button', { name: 'Complete quest' }));
    expect(await screen.findByText('Quest complete!')).toBeVisible();
    expect(screen.getByText(/\+99 XP/)).toBeVisible();
    expect(screen.getByText(/Confirmed from your account/)).toBeVisible();
    expect(rpcCalls(world, 'complete_quest')).toHaveLength(1);
  });

  it('after a network error with no completion, does not show success and retries with the same scan id', async () => {
    grantCamera();
    world.offer = () => ({ data: { ok: true, instance: { id: 'inst-9', objective: 'Pose', prompt: null, estimated_time: null } } });
    world.complete = (_p, attempt) => (attempt === 1 ? { error: new Error('network lost') } : completeOk());
    await mount();
    await scanGood();
    await fireEvent.press(screen.getByRole('button', { name: 'Complete quest' }));
    expect(await screen.findByText(/couldn't confirm your completion/)).toBeVisible();
    expect(screen.queryByText('Quest complete!')).toBeNull();
    expect(screen.queryByText(/\+\d+ XP/)).toBeNull();
    expect((await stored())[0].scanId).toBe('scan-1');
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Quest complete!')).toBeVisible();
    const calls = rpcCalls(world, 'complete_quest');
    expect(calls).toHaveLength(2);
    expect(calls[1].params).toEqual(calls[0].params);
    expect(calls[1].params.p_source_scan_id).toBe('scan-1');
  });

  it('scan_required clears the stored scan and asks to scan again', async () => {
    grantCamera();
    world.complete = () => ({ data: { ok: false, error: 'scan_required' } });
    await mount();
    await scanGood();
    await fireEvent.press(screen.getByRole('button', { name: 'Complete quest' }));
    expect(await screen.findByText(/scan expired or was already used/)).toBeVisible();
    expect(await stored()).toEqual([]);
    expect(screen.getByRole('button', { name: 'Scan the SideQuests code' })).toBeVisible();
    expect(screen.queryByText('Quest complete!')).toBeNull();
  });

  it('already_completed becomes a completed view, not an error', async () => {
    grantCamera();
    world.complete = () => ({ data: { ok: false, error: 'already_completed' } });
    await mount();
    await scanGood();
    world.completions = [completionRow()];
    await fireEvent.press(screen.getByRole('button', { name: 'Complete quest' }));
    expect(await screen.findByText('Quest completed')).toBeVisible();
    expect(screen.getByText(/You completed this quest on/)).toBeVisible();
    expect(screen.queryByText('Quest complete!')).toBeNull();
    expect(await stored()).toEqual([]);
  });

  it('instance_invalid regenerates the instance and lets the user retry', async () => {
    grantCamera();
    let instance = 'inst-old';
    world.offer = () => ({ data: { ok: true, instance: { id: instance, objective: `Objective ${instance}`, prompt: null, estimated_time: null } } });
    world.complete = (_p, attempt) => (attempt === 1 ? { data: { ok: false, error: 'instance_invalid' } } : completeOk());
    await mount();
    await scanGood();
    instance = 'inst-new';
    await fireEvent.press(screen.getByRole('button', { name: 'Complete quest' }));
    expect(await screen.findByText(/objective was refreshed/)).toBeVisible();
    expect(screen.queryByText('Quest complete!')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Complete quest' }));
    await screen.findByText('Quest complete!');
    const calls = rpcCalls(world, 'complete_quest');
    expect(calls[0].params.p_instance_id).toBe('inst-old');
    expect(calls[1].params.p_instance_id).toBe('inst-new');
    expect(calls[1].params.p_source_scan_id).toBe('scan-1');
  });
});

describe('status and persistence', () => {
  it('shows an already completed quest without a scanner', async () => {
    world.completions = [completionRow()];
    // The real generate_quest_instance reports a completed once-ever quest as already_completed.
    world.offer = () => ({ data: { ok: false, error: 'already_completed' } });
    await mount();
    expect(await screen.findByText('Quest completed', {}, { timeout: 8000 })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Scan the SideQuests code' })).toBeNull();
  });

  it('shows the cooldown date from the server', async () => {
    world.offer = () => ({ data: { ok: false, error: 'cooldown', availableAt: '2026-12-25T00:00:00Z' } });
    await mount();
    expect(await screen.findByText(/Available again on Dec 2[45], 2026/, {}, { timeout: 8000 })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Scan the SideQuests code' })).toBeNull();
  });

  it('restores a stored verified scan after a restart and completes it with the same scan id', async () => {
    grantCamera();
    await mount();
    await scanGood();
    expect((await stored())[0]).toMatchObject({ userId: 'u1', questId: QUEST_ID, scanId: 'scan-1' });
    await act(async () => {
      cleanup();
    });
    await mount();
    expect(await screen.findByText('Scan verified — not completed yet', {}, { timeout: 8000 })).toBeVisible();
    await fireEvent.press(screen.getByRole('button', { name: 'Complete quest' }));
    await screen.findByText('Quest complete!');
    expect(rpcCalls(world, 'complete_quest')[0].params.p_source_scan_id).toBe('scan-1');
    expect(rpcCalls(world, 'record_code_scan')).toHaveLength(1);
  });

  it("ignores another user's stored scan and an expired one", async () => {
    await AsyncStorage.setItem(
      storageKeys.questLoop,
      JSON.stringify([
        { userId: 'someone-else', questId: QUEST_ID, scanId: 'foreign', scannedAt: Date.now() },
        { userId: 'u1', questId: QUEST_ID, scanId: 'old', scannedAt: Date.now() - 3 * 60 * 60 * 1000 },
      ]),
    );
    await mount();
    expect(await screen.findByRole('button', { name: 'Scan the SideQuests code' }, { timeout: 8000 })).toBeVisible();
    expect(screen.queryByText('Scan verified — not completed yet')).toBeNull();
  });
});

describe('quest detail CTA', () => {
  it('shows Completed (disabled) for a completed quest', async () => {
    world.completions = [completionRow()];
    await mount({ url: `/quests/${QUEST_ID}` });
    const button = await screen.findByRole('button', { name: 'Completed' }, { timeout: 8000 });
    expect(button).toBeDisabled();
  });

  it('shows the repeat date during a device-computed cooldown without blocking Start (server decides)', async () => {
    world.quests = [{ ...(world.quests[0] as object), repeat_cooldown_days: 36500 }, world.quests[1]];
    world.completions = [completionRow()];
    await mount({ url: `/quests/${QUEST_ID}` });
    expect(await screen.findByText(/You can repeat this quest from /, {}, { timeout: 8000 })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start quest' })).toBeEnabled();
  });

  it('lets the server offer override a device-clock cooldown on the completion screen', async () => {
    world.quests = [{ ...(world.quests[0] as object), repeat_cooldown_days: 1 }, world.quests[1]];
    // Device clock says the 1-day cooldown is still running...
    world.completions = [completionRow({ completed_at: new Date(Date.now() - 23 * 3600_000).toISOString() })];
    // ...but the server says the quest is available.
    world.offer = () => ({ data: { ok: true, instance: null } });
    grantCamera();
    await mount();
    expect(await screen.findByRole('button', { name: 'Scan the SideQuests code' }, { timeout: 8000 })).toBeVisible();
  });

  it('shows Continue when a verified scan is pending', async () => {
    await AsyncStorage.setItem(
      storageKeys.questLoop,
      JSON.stringify([{ userId: 'u1', questId: QUEST_ID, scanId: 'scan-1', scannedAt: Date.now() }]),
    );
    await mount({ url: `/quests/${QUEST_ID}` });
    expect(await screen.findByRole('button', { name: 'Continue (verified scan pending)' }, { timeout: 8000 })).toBeVisible();
  });

  it('keeps Start quest for guests', async () => {
    await mount({ url: `/quests/${QUEST_ID}`, session: false });
    expect(await screen.findByRole('button', { name: 'Start quest' }, { timeout: 8000 })).toBeVisible();
  });
});
