import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveBackend, PRODUCTION_PROJECT_REF } from '../../src/lib/config';
import {
  decodeReturnTarget,
  encodeReturnTarget,
  hrefForTarget,
  loadPendingReturn,
  PENDING_RETURN_TTL_MS,
  savePendingReturn,
} from '../../src/lib/navigation/returnTo';
import { secureSessionStorage } from '../../src/lib/secureSessionStorage';
import { accountGate } from '../../src/session/accountGate';
import { makeSession } from '../support/fakeSupabase';

describe('backend configuration', () => {
  it('reports missing configuration instead of inventing a backend', () => {
    expect(resolveBackend(undefined, undefined).status).toBe('missing');
    expect(resolveBackend('https://abc.supabase.co', undefined).status).toBe('missing');
  });

  it('refuses the production project for development/staging builds', () => {
    const result = resolveBackend(`https://${PRODUCTION_PROJECT_REF}.supabase.co`, 'key');
    expect(result.status).toBe('refused');
  });

  it('refuses plain http except for local development hosts', () => {
    expect(resolveBackend('http://staging.example.com', 'key').status).toBe('refused');
    expect(resolveBackend('http://127.0.0.1:54321', 'key').status).toBe('ready');
  });

  it('accepts an approved non-production project', () => {
    expect(resolveBackend('https://devproject.supabase.co/', 'key')).toEqual({
      status: 'ready',
      url: 'https://devproject.supabase.co',
      publishableKey: 'key',
      projectRef: 'devproject',
    });
  });
});

describe('return destinations', () => {
  beforeEach(() => AsyncStorage.clear());

  it('round-trips valid targets and rejects anything path-like', () => {
    expect(decodeReturnTarget(encodeReturnTarget({ kind: 'quest', questId: 'a1b2-c3' }))).toEqual({ kind: 'quest', questId: 'a1b2-c3' });
    expect(decodeReturnTarget('tab:profile')).toEqual({ kind: 'tab', tab: 'profile' });
    expect(decodeReturnTarget('quest:../../settings')).toBeNull();
    expect(decodeReturnTarget('quest:a:b')).toBeNull();
    expect(decodeReturnTarget('tab:admin')).toBeNull();
    expect(decodeReturnTarget('https://evil.example')).toBeNull();
    expect(decodeReturnTarget(undefined)).toBeNull();
  });

  it('builds router hrefs with the quest id as a string param', () => {
    expect(hrefForTarget({ kind: 'quest', questId: 'q-1' })).toEqual({ pathname: '/quests/[questId]', params: { questId: 'q-1' } });
    expect(hrefForTarget({ kind: 'tab', tab: 'explore' })).toBe('/');
    expect(hrefForTarget(null)).toBe('/');
  });

  it('persists a pending return across restarts and expires stale ones', async () => {
    await savePendingReturn({ kind: 'quest', questId: 'q-9' });
    expect(await loadPendingReturn()).toEqual({ kind: 'quest', questId: 'q-9' });
    expect(await loadPendingReturn(Date.now() + PENDING_RETURN_TTL_MS + 1)).toBeNull();
  });
});

describe('secure session storage', () => {
  it('chunks large values and removes every chunk', async () => {
    const value = 'x'.repeat(5000);
    await secureSessionStorage.setItem('sb-test-auth-token', value);
    expect(await secureSessionStorage.getItem('sb-test-auth-token')).toBe(value);
    await secureSessionStorage.setItem('sb-test-auth-token', 'short');
    expect(await secureSessionStorage.getItem('sb-test-auth-token')).toBe('short');
    await secureSessionStorage.removeItem('sb-test-auth-token');
    expect(await secureSessionStorage.getItem('sb-test-auth-token')).toBeNull();
    const store = (jest.requireMock('expo-secure-store') as { __store: Map<string, string> }).__store;
    expect([...store.keys()].filter((k) => k.startsWith('sb-test-auth-token'))).toEqual([]);
  });
});

describe('account gate', () => {
  const target = { kind: 'quest', questId: 'q-1' } as const;
  const session = makeSession();
  const profile = { onboarding_completed: false } as never;

  it('sends guests to sign-in and incomplete profiles to onboarding, carrying the quest', () => {
    expect(accountGate({ status: 'guest' }, target)).toEqual({
      kind: 'redirect',
      href: { pathname: '/auth/sign-in', params: { returnTo: 'quest:q-1' } },
    });
    expect(accountGate({ status: 'needs_onboarding', session, profile }, target)).toEqual({
      kind: 'redirect',
      href: { pathname: '/onboarding', params: { returnTo: 'quest:q-1' } },
    });
    expect(accountGate({ status: 'ready', session, profile }, target)).toEqual({ kind: 'proceed' });
    expect(accountGate({ status: 'error', session, message: 'x' }, target).kind).toBe('blocked');
  });
});
