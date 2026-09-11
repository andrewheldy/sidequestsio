import { track } from './analytics.ts'
import {
  createHandoff,
  createLocalStorageStore,
  createMemoryStore,
  resolveHandoff,
} from './handoff.ts'
import type { HandoffPayload, HandoffRecord, HandoffResolution, HandoffStore } from './handoff.ts'

/** App-level handoff store: localStorage when available, memory otherwise. */
function buildStore(): HandoffStore {
  try {
    return createLocalStorageStore(window.localStorage)
  } catch {
    return createMemoryStore()
  }
}

const store = buildStore()

export function sendToPhone(payload: HandoffPayload): HandoffRecord {
  const record = createHandoff(store, payload)
  track('handoff_created', { kind: payload.kind, slug: payload.slug })
  return record
}

export function resolveToken(token: string): HandoffResolution {
  const resolution = resolveHandoff(store, token)
  if (resolution.status === 'ok') {
    track('handoff_opened', { kind: resolution.record.kind, slug: resolution.record.slug })
  }
  return resolution
}
