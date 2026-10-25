import { installFakeSupabase } from '../support/mockBackend';

const backend = installFakeSupabase();
const api = require('../../src/features/profile/deletion') as typeof import('../../src/features/profile/deletion');

it('reads only the caller’s pending request', async () => {
  const fake = backend.reset(null, () => ({ data: null }));
  expect(await api.getPendingDeletion('u1')).toBeNull();
  expect(fake.calls[0].name).toBe('account_deletion_requests');
  expect(fake.calls[0].ops).toEqual(
    expect.arrayContaining([
      { op: 'eq', args: ['user_id', 'u1'] },
      { op: 'eq', args: ['status', 'pending'] },
    ]),
  );
});

it.each(['PGRST202', 'PGRST205', '42P01'])('maps a missing 0030 object (%s) to DeletionUnsupportedError', async (code) => {
  backend.reset(null, () => ({ error: { code, message: 'missing' } }));
  await expect(api.requestAccountDeletion()).rejects.toBeInstanceOf(api.DeletionUnsupportedError);
  await expect(api.getPendingDeletion('u1')).rejects.toBeInstanceOf(api.DeletionUnsupportedError);
});

it('treats cancel with nothing pending as null, and an unauthenticated result as an error', async () => {
  backend.reset(null, () => ({ data: { ok: false, error: 'not_pending' } }));
  expect(await api.cancelAccountDeletion()).toBeNull();
  backend.reset(null, () => ({ data: { ok: false, error: 'not_authenticated' } }));
  await expect(api.requestAccountDeletion()).rejects.toThrow('Sign in again');
});
