import { installFakeSupabase } from '../support/mockBackend';

const backend = installFakeSupabase();
const api = require('../../src/lib/api/progress') as typeof import('../../src/lib/api/progress');

it('reads progress for the given user only and returns null when missing', async () => {
  const fake = backend.reset(null, () => ({ data: null }));
  expect(await api.getProgress('u1')).toBeNull();
  expect(fake.calls[0].name).toBe('user_profiles');
  expect(fake.calls[0].ops).toEqual(expect.arrayContaining([{ op: 'eq', args: ['user_id', 'u1'] }]));
});

it('lists completions newest first and surfaces errors', async () => {
  const fake = backend.reset(null, () => ({ data: [{ id: 'c1' }] }));
  expect(await api.listCompletions('u1')).toEqual([{ id: 'c1' }]);
  expect(fake.calls[0].ops).toEqual(expect.arrayContaining([{ op: 'order', args: ['completed_at', { ascending: false }] }]));
  backend.reset(null, () => ({ error: new Error('offline') }));
  await expect(api.listCompletions('u1')).rejects.toThrow('offline');
});
