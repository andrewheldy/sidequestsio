import { act } from '@testing-library/react-native';
import { screen } from 'expo-router/testing-library';
import type { RecordedCall } from '../support/fakeSupabase';
import { profileRow, quest, questsHandler } from '../discovery/fixtures';

type Reply = { data?: unknown; error?: unknown } | undefined;

/** Mutable fake server state for the quest loop. Mocked, not a backend integration. */
export interface World {
  userId: string;
  quests: Record<string, unknown>[];
  scan: (params: Record<string, unknown>) => Reply;
  offer: () => Reply;
  complete: (params: Record<string, unknown>, attempt: number) => Reply;
  completions: Record<string, unknown>[];
  progress: Record<string, unknown> | null;
  progressError: boolean;
  rewards: Record<string, unknown>[];
  rewardsError: boolean;
  /** Every rpc seen, in order. */
  rpcs: { name: string; params: Record<string, unknown> }[];
}

export const QUEST_ID = 'q-loop';
export const scanOk = (questId = QUEST_ID, id = 'scan-1') => ({
  data: { ok: true, questId, codeKind: 'qr', scan: { id, created_at: new Date().toISOString() } },
});
export const completeOk = (extra: Record<string, unknown> = {}) => ({
  data: { ok: true, completion: { id: 'c-1' }, xpAwarded: 120, pointsAwarded: 45, newLevel: 1, leveledUp: false, ...extra },
});

export function makeWorld(over: Partial<World> = {}): World {
  return {
    userId: 'u1',
    quests: [quest(QUEST_ID, { title: 'Loop Quest', funky_action: 'Pose with the mural' }), quest('q-gps', { verification_type: 'gps' })],
    scan: () => scanOk(),
    offer: () => ({ data: { ok: true, instance: null } }),
    complete: () => completeOk(),
    completions: [],
    progress: { user_id: 'u1', xp: 300, level: 2, points_balance_cache: 90, lifetime_points: 90, completed_quests_count: 2, rewards_redeemed_count: 0 },
    progressError: false,
    rewards: [],
    rewardsError: false,
    rpcs: [],
    ...over,
  };
}

export function worldHandler(world: World) {
  const quests = () => questsHandler(world.quests);
  return (call: RecordedCall): Reply => {
    if (call.kind === 'rpc') {
      const params = (call.ops[0].args[0] ?? {}) as Record<string, unknown>;
      world.rpcs.push({ name: call.name, params });
      if (call.name === 'record_code_scan') return world.scan(params);
      if (call.name === 'generate_quest_instance') return world.offer();
      if (call.name === 'complete_quest') return world.complete(params, world.rpcs.filter((r) => r.name === 'complete_quest').length);
      return undefined;
    }
    switch (call.name) {
      case 'quests':
        return quests()(call);
      case 'profiles':
        return { data: profileRow(world.userId) };
      case 'quest_completions':
        return call.ops.some((o) => o.op === 'maybeSingle') ? { data: world.completions[0] ?? null } : { data: world.completions };
      case 'user_profiles':
        return world.progressError ? { error: new Error('offline') } : { data: world.progress };
      case 'rewards':
        return world.rewardsError ? { error: new Error('offline') } : { data: world.rewards };
      default:
        return undefined;
    }
  };
}

export const rpcCalls = (world: World, name: string) => world.rpcs.filter((r) => r.name === name);

/** Feeds one barcode event to the mounted camera, like a camera frame would. */
export async function scanPayload(data: string) {
  await act(async () => {
    screen.getByTestId('camera-view').props.onBarcodeScanned({ data });
  });
}

export const completionRow = (extra: Record<string, unknown> = {}) => ({
  id: 'c-1',
  user_id: 'u1',
  quest_id: QUEST_ID,
  venue_id: 'v-1',
  partner_id: 'p-1',
  completed_at: '2026-10-01T12:00:00Z',
  xp_awarded: 120,
  points_awarded: 45,
  source_scan_id: 'scan-1',
  ...extra,
});
