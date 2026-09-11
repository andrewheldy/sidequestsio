import { describe, expect, it } from 'vitest'
import { formatDuration, timeAgo } from './format.ts'

describe('formatDuration', () => {
  it('formats mm:ss with zero padding', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(72)).toBe('1:12')
    expect(formatDuration(243)).toBe('4:03')
  })
})

describe('timeAgo', () => {
  it('uses minutes under an hour and rounds hours after', () => {
    expect(timeAgo(42)).toBe('42 min ago')
    expect(timeAgo(60)).toBe('1 hr ago')
    expect(timeAgo(130)).toBe('2 hrs ago')
  })
})
