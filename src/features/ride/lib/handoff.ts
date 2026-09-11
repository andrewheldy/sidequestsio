/**
 * Opaque handoff tokens for the send-to-phone flow.
 *
 * Tokens are random (no internal IDs leak into the URL) and map to a payload
 * stored locally. In the self-contained prototype the "phone" continuation is the
 * same browser opening /go/[token]; a real deployment would persist the mapping
 * server-side with the same shape.
 */
export interface HandoffPayload {
  kind: 'story' | 'entertainment' | 'sidequest' | 'offer' | 'music'
  slug: string
  title: string
  detail: string
  sponsorLabel?: string
}

export interface HandoffRecord extends HandoffPayload {
  token: string
  createdAt: number
  expiresAt: number
}

export type HandoffResolution =
  | { status: 'ok'; record: HandoffRecord }
  | { status: 'expired'; record: HandoffRecord }
  | { status: 'invalid' }

export const HANDOFF_TTL_MS = 30 * 60 * 1000

/** Crockford-ish base32 alphabet — no ambiguous characters in rider-visible codes. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ0123456789'

export function generateToken(randomBytes: (n: number) => Uint8Array = defaultRandom): string {
  const bytes = randomBytes(10)
  let out = ''
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length]
  return out
}

function defaultRandom(n: number): Uint8Array {
  const bytes = new Uint8Array(n)
  crypto.getRandomValues(bytes)
  return bytes
}

export interface HandoffStore {
  get(token: string): HandoffRecord | undefined
  set(record: HandoffRecord): void
}

/**
 * localStorage-backed store used by the app; tests inject an in-memory store.
 *
 * Persistence is best-effort. A tablet with a full or disabled storage quota must
 * never break Send to my phone mid-ride, so every write is also mirrored in memory
 * and reads fall back to that mirror for the life of the session.
 */
export function createLocalStorageStore(storage: Storage): HandoffStore {
  const KEY = 'feed.handoffs.v1'
  const mirror = new Map<string, HandoffRecord>()
  const read = (): Record<string, HandoffRecord> => {
    try {
      return JSON.parse(storage.getItem(KEY) ?? '{}') as Record<string, HandoffRecord>
    } catch {
      return {}
    }
  }
  return {
    get: (token) => read()[token] ?? mirror.get(token),
    set: (record) => {
      mirror.set(record.token, record)
      const all = read()
      all[record.token] = record
      try {
        storage.setItem(KEY, JSON.stringify(all))
      } catch {
        // Quota exceeded or storage disabled — the mirror keeps this session working.
      }
    },
  }
}

export function createMemoryStore(): HandoffStore {
  const map = new Map<string, HandoffRecord>()
  return {
    get: (token) => map.get(token),
    set: (record) => void map.set(record.token, record),
  }
}

export function createHandoff(
  store: HandoffStore,
  payload: HandoffPayload,
  now: number = Date.now(),
  token: string = generateToken(),
): HandoffRecord {
  const record: HandoffRecord = {
    ...payload,
    token,
    createdAt: now,
    expiresAt: now + HANDOFF_TTL_MS,
  }
  store.set(record)
  return record
}

export function resolveHandoff(
  store: HandoffStore,
  token: string,
  now: number = Date.now(),
): HandoffResolution {
  const record = store.get(token.toUpperCase())
  if (!record) return { status: 'invalid' }
  if (now > record.expiresAt) return { status: 'expired', record }
  return { status: 'ok', record }
}

export function handoffUrl(token: string): string {
  return `/go/${token}`
}
