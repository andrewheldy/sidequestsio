import { Platform } from 'react-native';
import { requireSupabase } from '../../lib/supabase';
import type { Quest, QuestCompletion } from '../../lib/types';
import { getAnonymousSessionId } from './storage';

/**
 * Server contract for the QR quest loop (0017/0018). Every function throws on
 * transport errors or unexpected shapes: callers must treat a throw as
 * "outcome unknown", never as success or failure.
 */

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// ---- scan -----------------------------------------------------------------

export type ScanOutcome =
  | { kind: 'verified'; questId: string; scanId: string; scannedAt: number }
  | { kind: 'invalid_code' };

export async function recordCodeScan(code: string): Promise<ScanOutcome> {
  const { data, error } = await requireSupabase().rpc('record_code_scan', {
    p_code: code,
    p_anonymous_session_id: await getAnonymousSessionId(),
    p_device_type: 'mobile',
    p_browser: null,
    p_operating_system: Platform.OS,
    p_referrer: null,
  });
  if (error) throw error;
  if (!isObject(data)) throw new Error('Unexpected scan response');
  if (data.ok === false && data.error === 'invalid_code') return { kind: 'invalid_code' };
  const scan = data.scan;
  if (data.ok === true && typeof data.questId === 'string' && isObject(scan) && typeof scan.id === 'string' && scan.id) {
    // scan_events stores its time in the "timestamp" column (0006/0018), not created_at.
    const created = typeof scan.timestamp === 'string' ? Date.parse(scan.timestamp) : NaN;
    const now = Date.now();
    // Trust the server timestamp unless it is nonsense (clock skew): the server still enforces its own 2h window.
    const scannedAt = Number.isFinite(created) && Math.abs(created - now) < 10 * 60_000 ? created : now;
    return { kind: 'verified', questId: data.questId, scanId: scan.id, scannedAt };
  }
  throw new Error('Unexpected scan response');
}

// ---- offer / instance -----------------------------------------------------

export interface QuestInstanceLite {
  id: string;
  objective: string;
  prompt: string | null;
  estimated_time: string | null;
}

export type OfferOutcome =
  | { kind: 'available'; instance: QuestInstanceLite | null }
  | { kind: 'already_completed' }
  | { kind: 'cooldown'; availableAt: string | null }
  | { kind: 'unavailable'; error: string };

export async function generateInstance(questId: string): Promise<OfferOutcome> {
  const { data, error } = await requireSupabase().rpc('generate_quest_instance', { p_quest_id: questId });
  if (error) throw error;
  if (!isObject(data) || typeof data.ok !== 'boolean') throw new Error('Unexpected offer response');
  if (data.ok) {
    const i = data.instance;
    if (isObject(i) && typeof i.id === 'string' && typeof i.objective === 'string') {
      return {
        kind: 'available',
        instance: {
          id: i.id,
          objective: i.objective,
          prompt: typeof i.prompt === 'string' ? i.prompt : null,
          estimated_time: typeof i.estimated_time === 'string' ? i.estimated_time : null,
        },
      };
    }
    return { kind: 'available', instance: null };
  }
  if (data.error === 'already_completed') return { kind: 'already_completed' };
  if (data.error === 'cooldown') return { kind: 'cooldown', availableAt: typeof data.availableAt === 'string' ? data.availableAt : null };
  return { kind: 'unavailable', error: typeof data.error === 'string' ? data.error : 'unknown' };
}

// ---- completion -----------------------------------------------------------

export type CompleteRejection =
  | 'not_found'
  | 'already_completed'
  | 'cooldown'
  | 'instance_invalid'
  | 'scan_required'
  | 'quest_inactive'
  | 'quest_expired'
  | 'verification_failed'
  | 'unknown';

const REJECTIONS: CompleteRejection[] = [
  'not_found',
  'already_completed',
  'cooldown',
  'instance_invalid',
  'scan_required',
  'quest_inactive',
  'quest_expired',
  'verification_failed',
];

export type CompleteOutcome =
  | { kind: 'success'; xp: number | null; points: number | null; leveledUp: boolean; newLevel: number | null }
  | { kind: 'rejected'; error: CompleteRejection; availableAt: string | null };

export async function completeQuest(input: { questId: string; scanId: string; instanceId?: string | null }): Promise<CompleteOutcome> {
  const { data, error } = await requireSupabase().rpc('complete_quest', {
    p_quest_id: input.questId,
    p_verification_method: 'qr',
    p_venue_code: null,
    p_source_scan_id: input.scanId,
    ...(input.instanceId ? { p_instance_id: input.instanceId } : {}),
  });
  if (error) throw error;
  if (!isObject(data)) throw new Error('Unexpected completion response');
  if (data.ok === true) {
    const completion = isObject(data.completion) ? data.completion : null;
    return {
      kind: 'success',
      xp: num(data.xpAwarded) ?? num(completion?.xp_awarded),
      points: num(data.pointsAwarded) ?? num(completion?.points_awarded),
      leveledUp: data.leveledUp === true,
      newLevel: num(data.newLevel),
    };
  }
  if (data.ok === false) {
    const code = REJECTIONS.find((r) => r === data.error) ?? 'unknown';
    return { kind: 'rejected', error: code, availableAt: typeof data.availableAt === 'string' ? data.availableAt : null };
  }
  throw new Error('Unexpected completion response');
}

// ---- status reads ---------------------------------------------------------

export async function getLatestCompletion(userId: string, questId: string): Promise<QuestCompletion | null> {
  const { data, error } = await requireSupabase()
    .from('quest_completions')
    .select('*')
    .eq('user_id', userId)
    .eq('quest_id', questId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as QuestCompletion | null) ?? null;
}

export type QuestStatus =
  | { kind: 'available' }
  | { kind: 'completed'; completedAt: string }
  | { kind: 'cooldown'; availableAt: string };

/**
 * Display-only status from the user's own completion row. The server stays
 * authoritative (complete_quest / generate_quest_instance re-check). A quest
 * with no repeat_cooldown_days is once-ever.
 */
export async function getQuestStatus(
  userId: string,
  quest: Pick<Quest, 'id' | 'repeat_cooldown_days'>,
  now = Date.now(),
): Promise<QuestStatus> {
  const latest = await getLatestCompletion(userId, quest.id);
  if (!latest) return { kind: 'available' };
  const days = quest.repeat_cooldown_days ?? 0;
  if (days > 0) {
    const at = Date.parse(latest.completed_at) + days * 86_400_000;
    if (Number.isFinite(at) && at > now) return { kind: 'cooldown', availableAt: new Date(at).toISOString() };
    return { kind: 'available' };
  }
  return { kind: 'completed', completedAt: latest.completed_at };
}
