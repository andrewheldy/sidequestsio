import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { RecordedCall } from '../support/fakeSupabase';

/** In-memory profiles/quests behind the fake Supabase client. Mocked: not a backend test. */
export interface FakeDb {
  profiles: Record<string, Record<string, unknown> | null>;
  quests: unknown[];
  failProfileReads: boolean;
  failUpsert: boolean;
  upserts: Record<string, unknown>[];
}

export function makeDb(partial: Partial<FakeDb> = {}): FakeDb {
  return { profiles: {}, quests: [], failProfileReads: false, failUpsert: false, upserts: [], ...partial };
}

export function profile(userId: string, onboardingCompleted: boolean) {
  return { user_id: userId, onboarding_completed: onboardingCompleted, interests: [] };
}

export function dbHandler(db: FakeDb) {
  return (call: RecordedCall) => {
    if (call.kind !== 'table') return undefined;
    if (call.name === 'quests') return { data: db.quests };
    if (call.name !== 'profiles') return undefined;
    const upsert = call.ops.find((o) => o.op === 'upsert');
    if (upsert) {
      if (db.failUpsert) return { error: { message: 'write failed' } };
      const payload = upsert.args[0] as Record<string, unknown>;
      db.upserts.push(payload);
      db.profiles[payload.user_id as string] = { ...(db.profiles[payload.user_id as string] ?? { user_id: payload.user_id }), ...payload };
      return { data: null };
    }
    if (db.failProfileReads) return { error: { message: 'profile unavailable' } };
    const eq = call.ops.find((o) => o.op === 'eq');
    return { data: db.profiles[eq?.args[1] as string] ?? null };
  };
}

export const press = async (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
export const type = async (label: string, value: string) => fireEvent.changeText(screen.getByLabelText(label), value);

export async function expectPath(rendered: { getPathname(): string }, path: string) {
  await waitFor(() => expect(rendered.getPathname()).toBe(path));
}

export const quest = (id: string, category: string, extra: Record<string, unknown> = {}) => ({
  id,
  title: `Quest ${id}`,
  category,
  status: 'active',
  start_date: null,
  end_date: null,
  venue: { name: 'Venue', neighborhood: null },
  ...extra,
});
