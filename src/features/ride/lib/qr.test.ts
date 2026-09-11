import { describe, expect, it } from 'vitest'
import { QR_SIZE, qrMatrix } from './qr.ts'

describe('qrMatrix', () => {
  it('returns a stable, square matrix for a token', () => {
    const a = qrMatrix('TOKEN12345')
    const b = qrMatrix('TOKEN12345')
    expect(a).toHaveLength(QR_SIZE)
    for (const row of a) expect(row).toHaveLength(QR_SIZE)
    expect(a).toEqual(b)
  })

  it('varies for different tokens', () => {
    expect(qrMatrix('AAAAAAAAAA')).not.toEqual(qrMatrix('BBBBBBBBBB'))
  })

  it('draws the three finder rings', () => {
    const m = qrMatrix('XYZ1234567')
    // Corners of each finder ring are dark; the ring interior gap is light.
    expect(m[0]![0]).toBe(true)
    expect(m[0]![QR_SIZE - 7]).toBe(true)
    expect(m[QR_SIZE - 7]![0]).toBe(true)
    expect(m[1]![1]).toBe(false)
    expect(m[3]![3]).toBe(true) // core
  })
})
