import type { RpcOptions, RpcResult } from '../api/rpc';
import type { Session } from '../auth/session';
import type { AdventureState, DeviceSettings, NudgeCandidate } from '../storage/deviceStore';
import { classifyRegionEvent, type RegionEvent } from './regions';

export const CLAIM_BUDGET_MS = 3_000;
export const MIN_GAP_MS = 3 * 60 * 60_000;
export const SAME_QUEST_SUPPRESSION_MS = 7 * 24 * 60 * 60_000;
const PROCESSING_LIMIT = 50;

export type ClaimResponse =
  | { allow: true; claimId: string; replay?: boolean; quest: { id: string; title: string; category: string; xpReward: number; pointsReward: number } }
  | { allow: false; reason: string };

export type ClaimArgs = {
  p_installation_id: string;
  p_idempotency_key: string;
  p_quest_id: string;
  p_region_id: string;
  p_catalog_version: string;
  p_policy_version: string;
};

export type NudgeNotification = { identifier: string; title: string; body: string; questId: string; claimId: string };

export type PipelineDeps = {
  now(): number;
  loadState(): Promise<AdventureState>;
  saveState(patch: Partial<AdventureState>): Promise<unknown>;
  loadSettings(): Promise<DeviceSettings>;
  getSession(): Promise<Session | null>;
  permissionsStillGranted(): Promise<boolean>;
  isDiscoveryVisible(): boolean;
  showInAppSuggestion(candidate: NudgeCandidate): void;
  claim(args: ClaimArgs, options: RpcOptions): Promise<RpcResult<ClaimResponse>>;
  recordResult(claimId: string, outcome: 'scheduled' | 'schedule_failed', options: RpcOptions): Promise<unknown>;
  schedule(notification: NudgeNotification): Promise<boolean>;
  refreshBundle(): Promise<void>;
  policyVersion: string;
};

/**
 * OS region event → local gates → one cached candidate → bounded server claim
 * → re-check the gate → one local notification → record the scheduling
 * result. Any failure means no notification; nothing is queued for later.
 * Returns what happened, for tests and diagnostics (no coordinates involved).
 */
export async function processGeofenceEvent(event: RegionEvent, deps: PipelineDeps): Promise<string> {
  const state = await deps.loadState();
  if (!state.gateOpen) return 'gated';
  const settings = await deps.loadSettings();
  if (settings.adventurePaused || settings.desiredMode !== 'adventure') return 'gated';

  const now = deps.now();
  const decision = classifyRegionEvent(state, event, now);
  await deps.saveState({ regionState: decision.regionState });
  if (decision.action === 'refresh') {
    await deps.refreshBundle();
    return 'refresh';
  }
  if (decision.action === 'ignore') return `ignored:${decision.reason}`;

  const bundle = state.bundle;
  if (!bundle || Date.parse(bundle.expiresAt) <= now) return 'stale_bundle';
  const session = await deps.getSession();
  if (!session || session.userId !== state.ownerUserId) return 'no_session';
  if (!(await deps.permissionsStillGranted())) return 'permission_missing';

  const candidate = bundle.candidates.find(
    (c) => c.regionId === event.regionId && now - (state.recentQuests[c.questId] ?? 0) > SAME_QUEST_SUPPRESSION_MS,
  );
  if (!candidate) return 'no_candidate';
  if (deps.isDiscoveryVisible()) {
    deps.showInAppSuggestion(candidate);
    return 'in_app';
  }

  // One key per region per minimum-gap window: overlapping or repeated events
  // collapse onto one claim, and the server deduplicates on it too.
  const key = `${settings.installationId}:${event.regionId}:${Math.floor(now / MIN_GAP_MS)}`;
  if (state.processing[key]) return 'duplicate';
  // Persist before the network call: after a crash we prefer a missed nudge to a duplicate.
  await deps.saveState({ processing: pruneProcessing({ ...state.processing, [key]: { state: 'claiming', at: now } }, now) });
  const finish = async (result: string, questScheduled = false) => {
    const latest = await deps.loadState();
    await deps.saveState({
      processing: { ...latest.processing, [key]: { state: 'done', at: now } },
      ...(questScheduled ? { recentQuests: { ...latest.recentQuests, [candidate.questId]: now } } : {}),
    });
    return result;
  };

  const started = deps.now();
  const claimed = await deps.claim(
    {
      p_installation_id: settings.installationId,
      p_idempotency_key: key,
      p_quest_id: candidate.questId,
      p_region_id: candidate.regionId,
      p_catalog_version: bundle.version,
      p_policy_version: deps.policyVersion,
    },
    { accessToken: session.accessToken, timeoutMs: CLAIM_BUDGET_MS },
  );
  if (!claimed.ok) return finish(`claim_failed:${claimed.error}`);
  if (!claimed.data.allow) return finish(`denied:${claimed.data.reason}`);
  const { claimId, quest } = claimed.data;

  // A pause, sign-out or switch may have happened while the claim was in flight.
  const after = await deps.loadState();
  const afterSettings = await deps.loadSettings();
  if (!after.gateOpen || after.ownerUserId !== session.userId || afterSettings.adventurePaused) {
    return finish('gated_after_claim');
  }

  const scheduled = await deps.schedule({
    identifier: `nudge:${claimId}`,
    title: 'SideQuests',
    body: nudgeCopy(quest.category, candidate.estimatedMinutes),
    questId: quest.id,
    claimId,
  });
  const remaining = CLAIM_BUDGET_MS - (deps.now() - started);
  if (remaining > 250) {
    await deps.recordResult(claimId, scheduled ? 'scheduled' : 'schedule_failed', { accessToken: session.accessToken, timeoutMs: remaining });
  }
  return finish(scheduled ? 'scheduled' : 'schedule_failed', scheduled);
}

const CATEGORY_WORDS: Record<string, string> = {
  art: 'art', food: 'food', outdoors: 'outdoor', culture: 'culture', nightlife: 'nightlife',
  shopping: 'shopping', fitness: 'wellness', hidden_gem: 'hidden-gem',
};

/** No precise place, no scarcity, no "we saw you" — just an invitation. */
export function nudgeCopy(category: string, estimatedMinutes: number | null) {
  const word = CATEGORY_WORDS[category] ?? 'side';
  const quick = estimatedMinutes != null && estimatedMinutes <= 20 ? 'quick ' : '';
  const article = /^[aeiou]/.test(quick || word) ? 'An' : 'A';
  return `${article} ${quick}${word} quest is nearby. Take a look while you’re out.`;
}

function pruneProcessing(processing: AdventureState['processing'], now: number) {
  const entries = Object.entries(processing)
    .filter(([, value]) => now - value.at < SAME_QUEST_SUPPRESSION_MS)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, PROCESSING_LIMIT);
  return Object.fromEntries(entries);
}
