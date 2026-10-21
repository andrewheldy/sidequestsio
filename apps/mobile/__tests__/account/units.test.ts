import AsyncStorage from '@react-native-async-storage/async-storage';
import { installFakeSupabase } from '../support/mockBackend';

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string, opts?: { queryParams?: Record<string, string> }) => `sidequests-test://${path.replace(/^\//, '')}?${new URLSearchParams(opts?.queryParams)}`),
}));
installFakeSupabase();
const { classifyAuthError } = require('../../src/features/account/authErrors') as typeof import('../../src/features/account/authErrors');
const { parseCallbackParams } = require('../../src/features/account/callbackParams') as typeof import('../../src/features/account/callbackParams');
const { loadOnboardingDraft, sanitizeDraft } = require('../../src/features/onboarding/draft') as typeof import('../../src/features/onboarding/draft');
const { suggestQuests } = require('../../src/features/onboarding/suggest') as typeof import('../../src/features/onboarding/suggest');
const { storageKeys } = require('../../src/lib/appStorage') as typeof import('../../src/lib/appStorage');

const { authRedirectUrl } = require('../../src/features/account/redirects') as typeof import('../../src/features/account/redirects');

beforeEach(() => AsyncStorage.clear());

describe('auth redirect URLs', () => {
  it('point at the callback route with the flow', () => {
    expect(authRedirectUrl('signup')).toBe('sidequests-test://auth/callback?flow=signup');
    expect(authRedirectUrl('recovery')).toBe('sidequests-test://auth/callback?flow=recovery');
  });
});

describe('auth error mapping', () => {
  it.each([
    [{ code: 'invalid_credentials', message: 'x' }, 'invalid_credentials'],
    [{ message: 'Email not confirmed' }, 'email_not_confirmed'],
    [{ status: 429, message: 'x' }, 'rate_limited'],
    [{ code: 'over_email_send_rate_limit', message: 'x' }, 'rate_limited'],
    [{ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' }, 'network'],
    [{ code: 'otp_expired', message: 'x' }, 'link_expired'],
    [{ code: 'weak_password', message: 'x' }, 'weak_password'],
    [{ message: 'something odd' }, 'unknown'],
  ])('%j -> %s', (error, kind) => {
    expect(classifyAuthError(error)).toBe(kind);
  });
});

describe('callback params', () => {
  it('accepts only expected params and rejects malformed codes', () => {
    expect(parseCallbackParams({ code: 'abc-123', flow: 'recovery', extra: 'ignored' })).toEqual({
      code: 'abc-123',
      flow: 'recovery',
      hasError: false,
      errorCode: null,
    });
    expect(parseCallbackParams({ code: 'bad code/../' }).code).toBeNull();
    expect(parseCallbackParams({ flow: 'weird' }).flow).toBe('signup');
    expect(parseCallbackParams({ error_code: 'otp_expired' }).hasError).toBe(true);
  });
});

describe('onboarding draft ownership', () => {
  const draft = (ownerUserId: string | null) => ({
    ownerUserId,
    step: 3,
    selections: { vibes: ['foodie', 'bogus'], explorerStyle: 'social', neighborhood: 'wynwood' },
    updatedAt: 1,
  });

  it('sanitizes unknown ids and clamps the step', () => {
    const d = sanitizeDraft({ ...draft(null), step: 99 })!;
    expect(d.selections.vibes).toEqual(['foodie']);
    expect(d.step).toBe(6);
    expect(sanitizeDraft({ nope: true })).toBeNull();
  });

  it('adopts a guest draft for the signed-in user', async () => {
    await AsyncStorage.setItem(storageKeys.onboardingDraft, JSON.stringify(draft(null)));
    const loaded = await loadOnboardingDraft('u1');
    expect(loaded?.ownerUserId).toBe('u1');
    expect(loaded?.selections.neighborhood).toBe('wynwood');
  });

  it('discards a draft owned by another user', async () => {
    await AsyncStorage.setItem(storageKeys.onboardingDraft, JSON.stringify(draft('someone-else')));
    expect(await loadOnboardingDraft('u1')).toBeNull();
    expect(await AsyncStorage.getItem(storageKeys.onboardingDraft)).toBeNull();
  });
});

describe('first-quest suggestions', () => {
  const q = (id: string, category: string, neighborhood: string | null = null) =>
    ({ id, title: id, category, venue: { name: 'v', neighborhood } }) as never;
  const sel = (vibes: string[], neighborhood: string | null = null) => ({ vibes, explorerStyle: null, neighborhood });

  it('matches vibe to category, ranks neighbourhood matches first, caps at 3', () => {
    const quests = [q('a', 'food'), q('b', 'food', 'Wynwood'), q('c', 'nightlife'), q('d', 'food'), q('e', 'food')];
    expect(suggestQuests(quests, sel(['foodie'], 'wynwood')).map((x: { id: string }) => x.id)).toEqual(['b', 'a', 'd']);
  });

  it('maps culture to culture and art, and community to nothing', () => {
    const quests = [q('a', 'art'), q('b', 'culture')];
    expect(suggestQuests(quests, sel(['culture'])).length).toBe(2);
    expect(suggestQuests(quests, sel(['community']))).toEqual([]);
    expect(suggestQuests([], sel(['foodie']))).toEqual([]);
  });
});
