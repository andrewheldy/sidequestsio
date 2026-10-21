/**
 * Minimal in-memory stand-in for the Supabase client used by screen/API tests.
 *
 * Every table query and rpc goes through `handler`, which sees the recorded
 * call (table/rpc name, chained operations, payload) and returns {data, error}.
 * Tests can assert on `calls` to verify exactly what would be sent.
 * This is a mocked/unit check, not a backend integration test.
 */
import type { Session } from '@supabase/supabase-js';

export interface RecordedCall {
  kind: 'table' | 'rpc';
  name: string;
  ops: { op: string; args: unknown[] }[];
}

export type Handler = (call: RecordedCall) => { data?: unknown; error?: unknown; count?: number } | undefined;

export function makeSession(userId = 'user-1', email = 'explorer@example.test'): Session {
  return {
    access_token: `access-${userId}`,
    refresh_token: `refresh-${userId}`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: userId,
      email,
      aud: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
      email_confirmed_at: '2026-01-01T00:00:00Z',
    },
  } as Session;
}

export function createFakeSupabase(initialSession: Session | null = null, handler: Handler = () => undefined) {
  let session = initialSession;
  let currentHandler = handler;
  const listeners = new Set<(event: string, s: Session | null) => void>();
  const calls: RecordedCall[] = [];

  const emit = (event: string) => listeners.forEach((l) => l(event, session));

  function builder(call: RecordedCall) {
    const resolve = () => {
      const res = currentHandler(call) ?? {};
      return { data: res.data ?? null, error: res.error ?? null, count: res.count ?? null };
    };
    const target: Record<string, unknown> = {};
    const proxy: unknown = new Proxy(target, {
      get(_t, prop: string) {
        if (prop === 'then') {
          return (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
            Promise.resolve().then(resolve).then(onFulfilled, onRejected);
        }
        return (...args: unknown[]) => {
          call.ops.push({ op: prop, args });
          return proxy;
        };
      },
    });
    return proxy;
  }

  const auth = {
    getSession: jest.fn(async () => ({ data: { session }, error: null })),
    onAuthStateChange: jest.fn((cb: (event: string, s: Session | null) => void) => {
      listeners.add(cb);
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
    }),
    signOut: jest.fn(async () => {
      session = null;
      emit('SIGNED_OUT');
      return { error: null };
    }),
    signInWithPassword: jest.fn(async () => ({ data: { session: null, user: null }, error: null })),
    signUp: jest.fn(async () => ({ data: { session: null, user: null }, error: null })),
    resend: jest.fn(async () => ({ data: {}, error: null })),
    resetPasswordForEmail: jest.fn(async () => ({ data: {}, error: null })),
    updateUser: jest.fn(async () => ({ data: { user: session?.user ?? null }, error: null })),
    exchangeCodeForSession: jest.fn(async () => ({ data: { session: null }, error: null })),
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn(),
  };

  const client = {
    auth,
    from: jest.fn((name: string) => {
      const call: RecordedCall = { kind: 'table', name, ops: [] };
      calls.push(call);
      return builder(call);
    }),
    rpc: jest.fn((name: string, params?: unknown) => {
      const call: RecordedCall = { kind: 'rpc', name, ops: [{ op: 'rpc', args: [params] }] };
      calls.push(call);
      return builder(call);
    }),
  };

  return {
    client,
    calls,
    setHandler(next: Handler) {
      currentHandler = next;
    },
    /** Simulate a sign-in/sign-out/token event from the auth server. */
    setSession(next: Session | null, event = next ? 'SIGNED_IN' : 'SIGNED_OUT') {
      session = next;
      emit(event);
    },
  };
}

export type FakeSupabase = ReturnType<typeof createFakeSupabase>;

/** Payload helpers for assertions. */
export const opArgs = (call: RecordedCall, op: string) => call.ops.find((o) => o.op === op)?.args;
