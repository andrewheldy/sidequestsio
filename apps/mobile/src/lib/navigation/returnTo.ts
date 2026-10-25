import type { Href } from 'expo-router';
import { readJson, removeKey, storageKeys, writeJson } from '../appStorage';

/**
 * Where to send the user after sign-in / sign-up / onboarding.
 *
 * Only these targets exist, so a tampered or stale value can never send the
 * user to an arbitrary route. Password recovery is deliberately NOT a target:
 * it has its own route and never mixes with ordinary returns.
 */
export type ReturnTarget =
  | { kind: 'quest'; questId: string }
  | { kind: 'tab'; tab: 'explore' | 'rewards' | 'profile' };

/** Quest ids are uuids today; allow slug-like ids but nothing path-like. */
const QUEST_ID = /^[A-Za-z0-9_-]{1,64}$/;
const TABS = new Set(['explore', 'rewards', 'profile']);
/** Pending returns older than this are dropped (e.g. an abandoned signup). */
export const PENDING_RETURN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function isValidQuestId(value: unknown): value is string {
  return typeof value === 'string' && QUEST_ID.test(value);
}

export function parseReturnTarget(value: unknown): ReturnTarget | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (v.kind === 'quest' && isValidQuestId(v.questId)) return { kind: 'quest', questId: v.questId };
  if (v.kind === 'tab' && typeof v.tab === 'string' && TABS.has(v.tab)) {
    return { kind: 'tab', tab: v.tab as 'explore' | 'rewards' | 'profile' };
  }
  return null;
}

/** Encodes a target as a single route param (e.g. `?returnTo=quest:abc`). */
export function encodeReturnTarget(target: ReturnTarget): string {
  return target.kind === 'quest' ? `quest:${target.questId}` : `tab:${target.tab}`;
}

export function decodeReturnTarget(param: unknown): ReturnTarget | null {
  if (typeof param !== 'string') return null;
  const [kind, value, ...rest] = param.split(':');
  if (rest.length > 0) return null;
  if (kind === 'quest') return parseReturnTarget({ kind, questId: value });
  if (kind === 'tab') return parseReturnTarget({ kind, tab: value });
  return null;
}

export function hrefForTarget(target: ReturnTarget | null): Href {
  if (!target) return '/';
  if (target.kind === 'quest') return { pathname: '/quests/[questId]', params: { questId: target.questId } };
  return target.tab === 'explore' ? '/' : `/${target.tab}`;
}

interface StoredReturn {
  target: ReturnTarget;
  savedAt: number;
}

/** Persist so the destination survives email confirmation and app restarts. */
export async function savePendingReturn(target: ReturnTarget): Promise<void> {
  await writeJson(storageKeys.pendingReturn, { target, savedAt: Date.now() } satisfies StoredReturn);
}

export async function loadPendingReturn(now = Date.now()): Promise<ReturnTarget | null> {
  const stored = await readJson<StoredReturn>(storageKeys.pendingReturn);
  if (!stored || typeof stored.savedAt !== 'number' || now - stored.savedAt > PENDING_RETURN_TTL_MS) return null;
  return parseReturnTarget(stored.target);
}

export async function clearPendingReturn(): Promise<void> {
  await removeKey(storageKeys.pendingReturn);
}
