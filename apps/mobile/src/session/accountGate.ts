import type { Href } from 'expo-router';
import { encodeReturnTarget, type ReturnTarget } from '../lib/navigation/returnTo';
import type { SessionState } from './sessionState';

/**
 * Navigation contract for actions that need an account (e.g. starting a quest).
 *
 * Returns where to send the user first, or null when they may proceed.
 * The intended destination always travels as `returnTo` so sign-in, sign-up,
 * email confirmation and onboarding can bring the user back to it:
 *
 *   /auth/sign-in?returnTo=quest:<id>
 *   /auth/sign-up?returnTo=quest:<id>
 *   /onboarding?returnTo=quest:<id>
 *
 * Password recovery (/auth/forgot-password, /auth/reset-password) never takes
 * a returnTo. Deep-link callbacks land on /auth/callback.
 */
export type GateResult =
  | { kind: 'proceed' }
  | { kind: 'redirect'; href: Href }
  | { kind: 'blocked'; reason: 'unconfigured' | 'restoring' | 'loading' | 'error' };

export function accountGate(state: SessionState, target: ReturnTarget): GateResult {
  const returnTo = encodeReturnTarget(target);
  switch (state.status) {
    case 'ready':
      return { kind: 'proceed' };
    case 'guest':
      return { kind: 'redirect', href: { pathname: '/auth/sign-in', params: { returnTo } } };
    case 'needs_onboarding':
      return { kind: 'redirect', href: { pathname: '/onboarding', params: { returnTo } } };
    case 'unconfigured':
      return { kind: 'blocked', reason: 'unconfigured' };
    case 'restoring':
      return { kind: 'blocked', reason: 'restoring' };
    case 'loading_profile':
      return { kind: 'blocked', reason: 'loading' };
    case 'error':
      return { kind: 'blocked', reason: 'error' };
  }
}
