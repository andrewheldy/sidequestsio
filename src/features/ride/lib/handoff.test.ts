import { describe, expect, it } from 'vitest'
import {
  HANDOFF_TTL_MS,
  createHandoff,
  createLocalStorageStore,
  createMemoryStore,
  generateToken,
  handoffUrl,
  resolveHandoff,
} from './handoff.ts'
import type { HandoffPayload } from './handoff.ts'

const payload: HandoffPayload = {
  kind: 'sidequest',
  slug: 'wynwood-art-route',
  title: 'Wynwood art route',
  detail: 'Six stops through the mural district.',
}

describe('generateToken', () => {
  it('produces 10-character tokens from the unambiguous alphabet', () => {
    const token = generateToken()
    expect(token).toHaveLength(10)
    expect(token).toMatch(/^[ABCDEFGHJKMNPQRSTVWXYZ0123456789]+$/)
  })

  it('is deterministic for injected randomness', () => {
    const fixed = (n: number) => new Uint8Array(n).fill(7)
    expect(generateToken(fixed)).toBe(generateToken(fixed))
  })

  it('never emits ambiguous characters (I, L, O, U)', () => {
    const sequential = (n: number) => Uint8Array.from({ length: n }, (_, i) => i * 13)
    const token = generateToken(sequential)
    expect(token).not.toMatch(/[ILOU]/)
  })
})

describe('createHandoff / resolveHandoff', () => {
  it('round-trips a payload through the store', () => {
    const store = createMemoryStore()
    const now = 1_000_000
    const record = createHandoff(store, payload, now)
    const res = resolveHandoff(store, record.token, now + 1000)
    expect(res.status).toBe('ok')
    if (res.status === 'ok') {
      expect(res.record.title).toBe(payload.title)
      expect(res.record.expiresAt).toBe(now + HANDOFF_TTL_MS)
    }
  })

  it('resolves case-insensitively (tokens are typed from a phone URL)', () => {
    const store = createMemoryStore()
    const record = createHandoff(store, payload, 0)
    expect(resolveHandoff(store, record.token.toLowerCase(), 1).status).toBe('ok')
  })

  it('expires exactly after the TTL', () => {
    const store = createMemoryStore()
    const now = 50_000
    const record = createHandoff(store, payload, now)
    expect(resolveHandoff(store, record.token, now + HANDOFF_TTL_MS).status).toBe('ok')
    expect(resolveHandoff(store, record.token, now + HANDOFF_TTL_MS + 1).status).toBe('expired')
  })

  it('reports unknown tokens as invalid', () => {
    const store = createMemoryStore()
    expect(resolveHandoff(store, 'NOTREAL123', 0).status).toBe('invalid')
  })

  it('never leaks internal ids into the URL', () => {
    const store = createMemoryStore()
    const record = createHandoff(store, payload, 0)
    const url = handoffUrl(record.token)
    expect(url).toBe(`/go/${record.token}`)
    expect(url).not.toContain(payload.slug)
  })
})

describe('createLocalStorageStore under storage failure', () => {
  /** A tablet whose storage is full or disabled: every access throws. */
  function hostileStorage(mode: 'write' | 'all'): Storage {
    const boom = () => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError')
    }
    return {
      length: 0,
      clear: () => {},
      key: () => null,
      removeItem: () => {},
      getItem: mode === 'all' ? boom : () => null,
      setItem: boom,
    } as unknown as Storage
  }

  it('does not throw when the write is rejected', () => {
    const store = createLocalStorageStore(hostileStorage('write'))
    expect(() => createHandoff(store, payload, 0)).not.toThrow()
  })

  it('still resolves the handoff in-session after a rejected write', () => {
    const store = createLocalStorageStore(hostileStorage('write'))
    const record = createHandoff(store, payload, 0)
    const res = resolveHandoff(store, record.token, 1)
    expect(res.status).toBe('ok')
    if (res.status === 'ok') expect(res.record.title).toBe(payload.title)
  })

  it('survives storage that throws on read as well as write', () => {
    const store = createLocalStorageStore(hostileStorage('all'))
    const record = createHandoff(store, payload, 0)
    expect(resolveHandoff(store, record.token, 1).status).toBe('ok')
    expect(resolveHandoff(store, 'NOTREAL123', 1).status).toBe('invalid')
  })
})
