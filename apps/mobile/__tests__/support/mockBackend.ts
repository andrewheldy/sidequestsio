/**
 * Route tests: install a fake Supabase client behind src/lib/supabase.
 *
 *   import { installFakeSupabase } from './support/mockBackend';
 *   const backend = installFakeSupabase();          // call at module top level
 *   beforeEach(() => backend.reset(null, handler)); // per test
 */
import type { Session } from '@supabase/supabase-js';
import { createFakeSupabase, type FakeSupabase, type Handler } from './fakeSupabase';

export function installFakeSupabase() {
  const holder: { current: FakeSupabase } = { current: createFakeSupabase() };
  jest.doMock('../../src/lib/config', () => {
    const actual = jest.requireActual('../../src/lib/config');
    return {
      ...actual,
      backend: { status: 'ready', url: 'https://test-project.supabase.co', publishableKey: 'test-key', projectRef: 'test-project' },
    };
  });
  jest.doMock('../../src/lib/supabase', () => {
    class BackendUnavailableError extends Error {}
    return {
      get supabase() {
        return holder.current.client;
      },
      requireSupabase: () => holder.current.client,
      BackendUnavailableError,
    };
  });
  return {
    get fake() {
      return holder.current;
    },
    reset(session: Session | null = null, handler?: Handler) {
      holder.current = createFakeSupabase(session, handler);
      return holder.current;
    },
  };
}
