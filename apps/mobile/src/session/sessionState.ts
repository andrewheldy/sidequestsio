import type { Session } from '@supabase/supabase-js';
import type { AccountProfile } from '../lib/types';

/**
 * Auth/profile states every screen and guard reads (one source of truth).
 *
 *  unconfigured      backend missing or refused (config.ts) — show setup state
 *  restoring         reading the persisted session at launch
 *  guest             no session; browsing is allowed
 *  loading_profile   signed in; profiles row being fetched / repaired
 *  needs_onboarding  signed in; profile exists, onboarding_completed = false
 *  ready             signed in with a completed profile
 *  error             signed in but the profile could not be loaded (retryable)
 */
export type SessionState =
  | { status: 'unconfigured'; message: string }
  | { status: 'restoring' }
  | { status: 'guest' }
  | { status: 'loading_profile'; session: Session }
  | { status: 'needs_onboarding'; session: Session; profile: AccountProfile }
  | { status: 'ready'; session: Session; profile: AccountProfile }
  | { status: 'error'; session: Session; message: string };

export type SessionStatus = SessionState['status'];

export function sessionOf(state: SessionState): Session | null {
  return 'session' in state ? state.session : null;
}

export function profileOf(state: SessionState): AccountProfile | null {
  return 'profile' in state ? state.profile : null;
}

export function stateForProfile(session: Session, profile: AccountProfile): SessionState {
  return profile.onboarding_completed
    ? { status: 'ready', session, profile }
    : { status: 'needs_onboarding', session, profile };
}
