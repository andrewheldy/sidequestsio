import { makeSession } from '../support/fakeSupabase';
import { installFakeSupabase } from '../support/mockBackend';

const backend = installFakeSupabase();
const api = require('../../src/lib/api/quests') as typeof import('../../src/lib/api/quests');

const quest = (id: string, extra: Record<string, unknown> = {}) => ({ id, title: id, status: 'active', start_date: null, end_date: null, ...extra });

it('lists only active, in-window quests and reports completeness', async () => {
  const fake = backend.reset(null, () => ({
    data: [quest('a'), quest('b', { end_date: '2000-01-01T00:00:00Z' }), quest('c', { start_date: '2999-01-01T00:00:00Z' })],
  }));
  const result = await api.listActiveQuests();
  expect(result.quests.map((q) => q.id)).toEqual(['a']);
  expect(result.complete).toBe(true);
  expect(fake.calls[0].ops).toEqual(expect.arrayContaining([{ op: 'eq', args: ['status', 'active'] }]));
});

it('surfaces errors instead of returning fallback data', async () => {
  backend.reset(makeSession(), () => ({ error: new Error('offline') }));
  await expect(api.listActiveQuests()).rejects.toThrow('offline');
  await expect(api.getQuest('x')).rejects.toThrow('offline');
});

it('returns null for an unknown quest', async () => {
  backend.reset(null, () => ({ data: null }));
  expect(await api.getQuest('missing')).toBeNull();
});
