// Run with: deno test supabase/functions/process-account-deletions/
// Uses an in-memory fake of the admin client: proves the processing logic, not
// the database, Storage or Auth services themselves.
import assert from 'node:assert/strict';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { processPendingDeletions } from './process.ts';

type Row = Record<string, unknown>;
interface FakeOptions {
  requests: Row[];
  partnerOwners?: string[];
  objects?: Record<string, string[]>; // bucket -> object paths
  authUsers?: Record<string, string>; // uid -> email
  failDeleteUser?: number; // fail this many deleteUser calls
  failRemove?: boolean;
}

function fakeAdmin(opts: FakeOptions) {
  const log: string[] = [];
  const requests = opts.requests;
  const objects = opts.objects ?? {};
  const authUsers = { ...(opts.authUsers ?? {}) };
  const deletedData = new Set<string>();
  let deleteUserFailures = opts.failDeleteUser ?? 0;

  const table = (name: string) => {
    const filters: [string, unknown][] = [];
    let patch: Row | null = null;
    let limit = Infinity;
    const run = () => {
      const match = (r: Row) => filters.every(([k, v]) => (v === null ? r[k] == null : r[k] === v));
      if (patch) {
        for (const r of requests.filter(match)) Object.assign(r, patch);
        log.push(`update ${name} ${Object.keys(patch).join(',')}`);
        return { data: null, error: null };
      }
      const rows = requests.filter(match).slice(0, limit).map((r) => ({ ...r }));
      return { data: rows, error: null };
    };
    const q: Record<string, unknown> = {
      select: () => q,
      update: (p: Row) => ((patch = p), q),
      eq: (k: string, v: unknown) => (filters.push([k, v]), q),
      is: (k: string, v: unknown) => (filters.push([k, v]), q),
      order: () => q,
      limit: (n: number) => ((limit = n), q),
      then: (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve(run()).then(ok, bad),
    };
    assert.equal(name, 'account_deletion_requests');
    return q;
  };

  const admin = {
    from: table,
    rpc: async (fn: string, { p_request_id }: { p_request_id: string }) => {
      assert.equal(fn, 'process_account_deletion_data');
      const r = requests.find((x) => x.id === p_request_id)!;
      if (r.status !== 'pending') return { data: { ok: true, outcome: 'not_pending' }, error: null };
      if (r.manual_review_reason) return { data: { ok: true, outcome: 'manual_review' }, error: null };
      if ((opts.partnerOwners ?? []).includes(r.user_id as string)) {
        r.manual_review_reason = 'owns_partner';
        log.push(`manual_review ${r.id}`);
        return { data: { ok: true, outcome: 'manual_review' }, error: null };
      }
      deletedData.add(r.user_id as string);
      r.data_deleted_at ??= '2026-10-23T00:00:00Z';
      log.push(`data_deleted ${r.user_id}`);
      return { data: { ok: true, outcome: 'data_deleted' }, error: null };
    },
    storage: {
      from: (bucket: string) => ({
        list: async (prefix: string, { limit, offset }: { limit: number; offset: number }) => {
          const under = (objects[bucket] ?? []).filter((p) => p.startsWith(`${prefix}/`)).map((p) => p.slice(prefix.length + 1));
          const entries = [...new Set(under.map((rest) => (rest.includes('/') ? `${rest.split('/')[0]}/` : rest)))];
          const page = entries.slice(offset, offset + limit).map((e) =>
            e.endsWith('/') ? { name: e.slice(0, -1), id: null } : { name: e, id: `obj-${e}` },
          );
          return { data: page, error: null };
        },
        remove: async (paths: string[]) => {
          if (opts.failRemove) return { data: null, error: { message: 'storage unavailable' } };
          objects[bucket] = (objects[bucket] ?? []).filter((p) => !paths.includes(p));
          log.push(`remove ${bucket} ${paths.length}`);
          return { data: [], error: null };
        },
      }),
    },
    auth: {
      admin: {
        getUserById: async (uid: string) =>
          authUsers[uid]
            ? { data: { user: { id: uid, email: authUsers[uid] } }, error: null }
            : { data: { user: null }, error: { status: 404, code: 'user_not_found', message: 'User not found' } },
        deleteUser: async (uid: string) => {
          if (deleteUserFailures > 0) {
            deleteUserFailures -= 1;
            return { data: null, error: { status: 500, message: 'auth unavailable' } };
          }
          if (!authUsers[uid]) return { data: null, error: { status: 404, code: 'user_not_found', message: 'User not found' } };
          delete authUsers[uid];
          log.push(`auth_deleted ${uid}`);
          return { data: {}, error: null };
        },
      },
    },
  };
  return { admin: admin as unknown as SupabaseClient, log, requests, objects, authUsers, deletedData };
}

const pending = (id: string, userId: string, extra: Row = {}): Row => ({
  id,
  user_id: userId,
  status: 'pending',
  manual_review_reason: null,
  data_deleted_at: null,
  notify_email: null,
  attempts: 0,
  requested_at: `2026-10-0${id.slice(-1)}T00:00:00Z`,
  ...extra,
});

Deno.test('deletes data, media and login in order, then completes and keeps the confirmation address', async () => {
  const f = fakeAdmin({
    requests: [pending('r1', 'u1')],
    authUsers: { u1: 'u1@example.test' },
    objects: { proofs: ['u1/q1/a.jpg', 'u1/q2/b.mp4', 'u2/keep.jpg'], avatars: ['u1/me.png'] },
  });
  const report = await processPendingDeletions(f.admin, { limit: 10 });
  assert.deepEqual(report, { examined: 1, completed: ['r1'], manualReview: [], skipped: [], failed: [] });
  assert.deepEqual(f.log, [
    'update account_deletion_requests notify_email',
    'data_deleted u1',
    'remove proofs 2',
    'remove avatars 1',
    'auth_deleted u1',
    'update account_deletion_requests status,completed_at,last_error',
  ]);
  assert.equal(f.requests[0].status, 'completed');
  assert.equal(f.requests[0].notify_email, 'u1@example.test');
  assert.deepEqual(f.objects.proofs, ['u2/keep.jpg']); // other users' media untouched
  assert.equal(f.authUsers.u1, undefined);
});

Deno.test('partner owners are flagged for manual review before anything is deleted', async () => {
  const f = fakeAdmin({
    requests: [pending('r1', 'owner')],
    partnerOwners: ['owner'],
    authUsers: { owner: 'owner@example.test' },
    objects: { proofs: ['owner/x.jpg'] },
  });
  const report = await processPendingDeletions(f.admin, { limit: 10 });
  assert.deepEqual(report.manualReview, ['r1']);
  assert.equal(f.requests[0].status, 'pending');
  assert.equal(f.requests[0].manual_review_reason, 'owns_partner');
  assert.equal(f.deletedData.size, 0);
  assert.deepEqual(f.objects.proofs, ['owner/x.jpg']);
  assert.equal(f.authUsers.owner, 'owner@example.test');
  // Flagged requests are not picked up again by later runs.
  const again = await processPendingDeletions(f.admin, { limit: 10 });
  assert.equal(again.examined, 0);
});

Deno.test('a failure keeps the request pending with bookkeeping, and the next run finishes it', async () => {
  const f = fakeAdmin({ requests: [pending('r1', 'u1')], authUsers: { u1: 'u1@example.test' }, failDeleteUser: 1 });
  const first = await processPendingDeletions(f.admin, { limit: 10 });
  assert.deepEqual(first.failed, [{ id: 'r1', error: 'auth unavailable' }]);
  assert.equal(f.requests[0].status, 'pending');
  assert.equal(f.requests[0].attempts, 1);
  assert.equal(f.requests[0].last_error, 'auth unavailable');
  assert.ok(f.requests[0].data_deleted_at);

  const second = await processPendingDeletions(f.admin, { limit: 10 });
  assert.deepEqual(second.completed, ['r1']);
  assert.equal(f.requests[0].status, 'completed');
  assert.equal(f.requests[0].last_error, null);
  // The address captured on the first run survives; the auth lookup is not repeated.
  assert.equal(f.requests[0].notify_email, 'u1@example.test');
});

Deno.test('an auth user that is already gone still completes (idempotent)', async () => {
  const f = fakeAdmin({ requests: [pending('r1', 'ghost')] });
  const report = await processPendingDeletions(f.admin, { limit: 10 });
  assert.deepEqual(report.completed, ['r1']);
  assert.equal(f.requests[0].notify_email, null);
});

Deno.test('storage errors are failures, not silent skips; cancelled and completed requests are ignored', async () => {
  const f = fakeAdmin({
    requests: [pending('r1', 'u1'), pending('r2', 'u2', { status: 'cancelled' }), pending('r3', 'u3', { status: 'completed' })],
    authUsers: { u1: 'u1@example.test' },
    objects: { proofs: ['u1/a.jpg'] },
    failRemove: true,
  });
  const report = await processPendingDeletions(f.admin, { limit: 10 });
  assert.equal(report.examined, 1);
  assert.deepEqual(report.failed, [{ id: 'r1', error: 'storage unavailable' }]);
  assert.equal(f.authUsers.u1, 'u1@example.test'); // login kept until media is gone
});

Deno.test('honours the batch limit, oldest first', async () => {
  const f = fakeAdmin({ requests: [pending('r1', 'u1'), pending('r2', 'u2'), pending('r3', 'u3')] });
  const report = await processPendingDeletions(f.admin, { limit: 2 });
  assert.deepEqual(report.completed, ['r1', 'r2']);
  assert.equal(f.requests[2].status, 'pending');
});
