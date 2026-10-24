import { callRpc, upsertRow, type RpcOptions } from '../api/rpc';
import type { Session } from '../auth/session';
import type { GeofenceBundle } from '../storage/deviceStore';
import type { ClaimArgs, ClaimResponse } from './pipeline';

// Server calls for Adventure (docs/product/LOCATION_DISCOVERY.md §5). The
// server derives the user from the token; no user id is trusted from here
// except as the RLS-checked owner column of the caller's own rows.

export type ConsentPurpose = 'location_foreground' | 'location_background' | 'notifications';

export function fetchGeofenceBundle(
  session: Session,
  origin: { latitude: number; longitude: number },
  installationId: string,
  options: RpcOptions = {},
) {
  return callRpc<GeofenceBundle>(
    'get_geofence_bundle',
    { p_origin_lat: origin.latitude, p_origin_lng: origin.longitude, p_installation_id: installationId },
    { ...options, accessToken: session.accessToken },
  );
}

export function claimNudge(args: ClaimArgs, options: RpcOptions) {
  return callRpc<ClaimResponse>('claim_nudge', args, options);
}

export function recordNudgeResult(claimId: string, outcome: 'scheduled' | 'schedule_failed' | 'opened', options: RpcOptions) {
  return callRpc<unknown>('record_nudge_result', { p_claim_id: claimId, p_outcome: outcome }, options);
}

export function recordConsent(
  session: Session,
  purpose: ConsentPurpose,
  granted: boolean,
  policyVersion: string,
  installationId: string,
) {
  return callRpc<unknown>(
    'record_consent',
    { p_purpose: purpose, p_granted: granted, p_policy_version: policyVersion, p_installation_id: installationId, p_source: 'mobile_settings' },
    { accessToken: session.accessToken },
  );
}

/** Mirrors this installation's Adventure switch and pause to the server, which checks it at claim time. */
export function syncInstallation(
  session: Session,
  installationId: string,
  state: { adventureEnabled: boolean; paused: boolean; consentVersion: string | null },
  options: RpcOptions = {},
) {
  return upsertRow(
    'nudge_installations',
    {
      user_id: session.userId,
      installation_id: installationId,
      adventure_enabled: state.adventureEnabled,
      paused: state.paused,
      consent_policy_version: state.consentVersion,
    },
    'user_id,installation_id',
    { ...options, accessToken: session.accessToken },
  );
}

/** Account-level cadence: the user may lower the cap to 1 or 0, never raise it. */
export function saveNudgeSettings(session: Session, settings: { maxPerDay: 0 | 1 | 2; timezone: string | null }) {
  return upsertRow(
    'nudge_settings',
    { user_id: session.userId, max_per_day: settings.maxPerDay, timezone: settings.timezone },
    'user_id',
    { accessToken: session.accessToken },
  );
}
