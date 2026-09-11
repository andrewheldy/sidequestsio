import { describe, expect, it } from 'vitest'
import * as data from '../data/index.ts'
import * as copy from './copy.ts'

// Note: tokens.css ↔ tokens.ts drift is guarded by scripts/check-brand-tokens.mjs,
// which runs ahead of this suite in `pnpm test`.

describe('approved sponsorship labels', () => {
  it('matches the locked identity exactly', () => {
    expect(Object.values(copy.sponsorshipLabels).sort()).toEqual(
      [
        'Sponsored',
        'Featured partner',
        'Promoted experience',
        'Sponsored SideQuest',
        'Community sponsor',
        'Demo sponsored placement',
      ].sort(),
    )
  })
})

describe('prohibited AI-style phrases (brand identity §10)', () => {
  it('never appear in brand copy or seeded content', () => {
    // Exclude the prohibited list itself from the corpus being swept.
    const riderCopy: Record<string, unknown> = { ...copy }
    delete riderCopy['prohibitedPhrases']
    const corpus = JSON.stringify({ riderCopy, data }).toLowerCase()
    for (const phrase of copy.prohibitedPhrases) {
      expect(corpus, `found prohibited phrase: "${phrase}"`).not.toContain(phrase)
    }
  })
})

describe('module identity', () => {
  it('keeps the locked module names and routes', () => {
    expect(copy.modules.news.name).toBe('NEWS')
    expect(copy.modules.music.name).toBe('MUSIC')
    expect(copy.modules.entertainment.name).toBe('ENTERTAINMENT')
    expect(copy.modules.joyride.name).toBe('JOYRIDE')
    expect(copy.modules.joyride.route).toBe('/ride/joyride')
    expect(copy.product.name).toBe('THE FEED')
  })
})
