import { describe, expect, it } from 'vitest'
import {
  cityTriviaQuestions,
  communityAnnouncements,
  entertainmentItems,
  gameCards,
  livePulseItems,
  musicCards,
  newsStories,
  queue,
  sideQuests,
  sponsoredPlacements,
} from './index.ts'

describe('content seed minimums (implementation guide §8)', () => {
  it('meets the seeded content floor', () => {
    expect(newsStories.length).toBeGreaterThanOrEqual(8)
    expect(entertainmentItems.length).toBeGreaterThanOrEqual(6)
    expect(queue.length + musicCards.length).toBeGreaterThanOrEqual(4)
    expect(cityTriviaQuestions.length).toBeGreaterThanOrEqual(10)
    expect(sideQuests.length).toBeGreaterThanOrEqual(3)
    expect(communityAnnouncements.length).toBeGreaterThanOrEqual(5)
    expect(sponsoredPlacements.length).toBeGreaterThanOrEqual(5)
    expect(livePulseItems.length).toBeGreaterThanOrEqual(5)
    expect(gameCards.length).toBe(4)
  })
})

describe('id and slug stability', () => {
  it('has unique ids everywhere', () => {
    const ids = [
      ...newsStories,
      ...entertainmentItems,
      ...queue,
      ...musicCards,
      ...communityAnnouncements,
      ...sponsoredPlacements,
      ...gameCards,
      ...cityTriviaQuestions,
      ...sideQuests,
      ...livePulseItems,
    ].map((x) => x.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has unique slugs within each sluggable collection', () => {
    for (const collection of [newsStories, entertainmentItems, sideQuests] as const) {
      const slugs = collection.map((x) => x.slug)
      expect(new Set(slugs).size).toBe(slugs.length)
    }
  })
})

describe('news integrity', () => {
  it('every story has attribution, freshness, and key points', () => {
    for (const story of newsStories) {
      expect(story.source.length).toBeGreaterThan(0)
      expect(story.publishedAgoMinutes).toBeGreaterThan(0)
      expect(story.readMinutes).toBeGreaterThan(0)
      expect(story.keyPoints.length).toBeGreaterThanOrEqual(2)
      expect(story.demo).toBe(true)
    }
  })

  it('exactly one story is featured', () => {
    expect(newsStories.filter((s) => s.featured).length).toBe(1)
  })
})

describe('trivia integrity', () => {
  it('every question has four unique options and a valid answer', () => {
    for (const q of cityTriviaQuestions) {
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options).size).toBe(4)
      expect(q.correctIndex).toBeGreaterThanOrEqual(0)
      expect(q.correctIndex).toBeLessThan(4)
      expect(q.funFact.length).toBeGreaterThan(0)
    }
  })

  it('marks exactly one game as playable (City Trivia)', () => {
    const playable = gameCards.filter((g) => g.playable)
    expect(playable.map((g) => g.key)).toEqual(['city-trivia'])
  })
})

describe('sponsorship integrity', () => {
  it('all advertisers are fictional demo placements with approved labels', () => {
    const approvedKeys = ['sponsored', 'featuredPartner', 'promotedExperience', 'communitySponsor']
    for (const p of sponsoredPlacements) {
      expect(p.fictional).toBe(true)
      expect(p.demo).toBe(true)
      expect(approvedKeys).toContain(p.labelKey)
      expect(p.offer.length).toBeGreaterThan(0)
      expect(p.cta.length).toBeGreaterThan(0)
    }
  })

  it('covers every rider surface slot', () => {
    const slots = new Set(sponsoredPlacements.map((p) => p.slot))
    for (const slot of ['attract', 'home', 'news', 'entertainment', 'joyride']) {
      expect(slots.has(slot as never)).toBe(true)
    }
  })

  it('never uses a known real business as an advertiser', () => {
    // Guard against reintroducing real brands from the mockup reference.
    const realBrands = ['autonation', 'pura vida', 'chainsmokers', 'bad bunny', 'ftx']
    const names = sponsoredPlacements.map((p) => p.advertiser.toLowerCase()).join(' ')
    for (const brand of realBrands) expect(names).not.toContain(brand)
  })
})

describe('sidequest integrity', () => {
  it('each quest has stats, stops preview, and a demo reward', () => {
    for (const quest of sideQuests) {
      expect(quest.durationMin).toBeGreaterThan(0)
      expect(quest.stops).toBeGreaterThanOrEqual(quest.stopsPreview.length)
      expect(quest.stopsPreview.length).toBeGreaterThanOrEqual(3)
      expect(quest.reward.toLowerCase()).toContain('demo')
      if (quest.sponsoredLabel) expect(quest.sponsorName).toBeTruthy()
    }
  })
})
