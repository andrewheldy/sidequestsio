import type { RecordedCall } from '../support/fakeSupabase';

/** In-memory tables behind the fake Supabase client. Mocked: not a backend test. */
export interface ProfileDb {
  profiles: Record<string, Record<string, unknown> | null>;
  progress: Record<string, Record<string, unknown> | null>;
  completions: Record<string, unknown[]>;
  privacy: Record<string, Record<string, unknown> | null>;
  quests: Record<string, unknown>;
  /** Error returned for the next/all writes of that table (key = table name). */
  failWrite: Record<string, { code?: string; message: string } | undefined>;
  failProgress: boolean;
  /** Recorded writes: [table, op, payload, eq args]. */
  writes: { table: string; op: string; payload: Record<string, unknown>; eq: unknown[] | undefined }[];
  profileReads: number;
}

export function makeDb(partial: Partial<ProfileDb> = {}): ProfileDb {
  return {
    profiles: {},
    progress: {},
    completions: {},
    privacy: {},
    quests: {},
    failWrite: {},
    failProgress: false,
    writes: [],
    profileReads: 0,
    ...partial,
  };
}

export const profileRow = (userId: string, extra: Record<string, unknown> = {}) => ({
  user_id: userId,
  display_name: 'Ana Diaz',
  username: 'ana',
  avatar_url: null,
  home_city: 'Miami',
  bio: 'Hello',
  interests: [],
  starting_area: null,
  onboarding_completed: true,
  is_public: false,
  show_completed_quests: true,
  ...extra,
});

export const progressRow = (userId: string, extra: Record<string, unknown> = {}) => ({
  user_id: userId,
  xp: 340,
  level: 3,
  points_balance_cache: 125,
  lifetime_points: 200,
  completed_quests_count: 2,
  rewards_redeemed_count: 0,
  ...extra,
});

export const completionRow = (id: string, questId: string, title: string, extra: Record<string, unknown> = {}) => ({
  id,
  user_id: 'u1',
  quest_id: questId,
  venue_id: null,
  partner_id: 'p-1',
  completed_at: '2026-03-02T12:00:00Z',
  xp_awarded: 120,
  points_awarded: 45,
  source_scan_id: null,
  quest: { id: questId, title, category: 'art', image_url: null },
  ...extra,
});

const eqArgs = (call: RecordedCall) => call.ops.find((o) => o.op === 'eq')?.args;
const has = (call: RecordedCall, op: string) => call.ops.some((o) => o.op === op);

export function profileHandler(db: ProfileDb) {
  return (call: RecordedCall) => {
    if (call.kind !== 'table') return undefined;
    const eq = eqArgs(call);
    const uid = eq?.[1] as string | undefined;

    for (const op of ['update', 'upsert', 'insert']) {
      if (!has(call, op)) continue;
      const payload = call.ops.find((o) => o.op === op)?.args[0] as Record<string, unknown>;
      const failure = db.failWrite[call.name];
      db.writes.push({ table: call.name, op, payload, eq });
      if (failure) return { error: failure };
      if (call.name === 'profiles' && uid) db.profiles[uid] = { ...db.profiles[uid], ...payload };
      if (call.name === 'privacy_preferences') {
        const id = payload.user_id as string;
        db.privacy[id] = { ...db.privacy[id], ...payload };
      }
      return { data: call.name === 'profiles' ? { user_id: uid } : null };
    }

    switch (call.name) {
      case 'profiles':
        db.profileReads += 1;
        return { data: (uid && db.profiles[uid]) || null };
      case 'user_profiles':
        return db.failProgress ? { error: { message: 'progress down' } } : { data: (uid && db.progress[uid]) || null };
      case 'quest_completions':
        return { data: (uid && db.completions[uid]) || [] };
      case 'privacy_preferences':
        return { data: (uid && db.privacy[uid]) || null };
      case 'quests': {
        if (has(call, 'maybeSingle')) return { data: db.quests[Object.keys(db.quests)[0]] ?? null };
        return { data: Object.values(db.quests) };
      }
      default:
        return undefined;
    }
  };
}
