import { callRpc } from '../api/rpc';
import type { Session } from '../auth/session';
import { getCurrent } from '../location/adapter';

// GPS presence for quests whose rules require it (docs/product/LOCATION_DISCOVERY.md §5).
// The server computes the result; the precise sample lives only in this call.
// A result is a signal for the existing completion flow, never an award.

export type PresenceOutcome = 'inside' | 'outside' | 'uncertain';
export type CheckInResult =
  | { ok: true; outcome: PresenceOutcome; reason: string; checkId: string }
  | { ok: false; error: string };

const SAMPLE_WAIT_MS = 15_000;

export async function checkInWithGps(session: Session, questId: string): Promise<CheckInResult> {
  const challenge = await callRpc<{ challengeId: string; expiresAt: string }>(
    'create_presence_challenge',
    { p_quest_id: questId },
    { accessToken: session.accessToken },
  );
  if (!challenge.ok) return { ok: false, error: challenge.error };

  const sample = await getCurrent({ precise: true, waitMs: SAMPLE_WAIT_MS });
  if (!sample) return { ok: false, error: 'location_unavailable' };

  const verified = await callRpc<{ outcome: PresenceOutcome; reason: string; checkId: string }>(
    'verify_gps_presence',
    {
      p_challenge_id: challenge.data.challengeId,
      p_latitude: sample.latitude,
      p_longitude: sample.longitude,
      p_accuracy_m: sample.accuracyM,
      p_captured_at: new Date(sample.capturedAt).toISOString(),
    },
    { accessToken: session.accessToken },
  );
  if (!verified.ok) return { ok: false, error: verified.error };
  return { ok: true, ...verified.data };
}

export function presenceMessage(result: CheckInResult) {
  if (!result.ok) {
    if (result.error === 'location_unavailable') return 'We couldn’t get a precise location. Try again in the open, or use the venue’s QR code.';
    return 'Check-in isn’t available right now. Try again, or use the venue’s QR code.';
  }
  if (result.outcome === 'inside') return 'You’re checked in here. Finish the quest to earn your rewards.';
  if (result.outcome === 'outside') return 'You seem to be outside this quest’s area. Head to the entrance and try again.';
  return 'We couldn’t confirm your location precisely enough. Try again, scan the venue’s QR code, or ask staff to verify.';
}
