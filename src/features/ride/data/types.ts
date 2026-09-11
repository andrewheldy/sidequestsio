/**
 * Shared content types for the mock data layer.
 * All content is fictional sample content for the prototype (`demo: true`), except
 * public places and general city facts, which may appear editorially.
 */

/** Abstract art treatment used instead of photography (see components/CardArt). */
export interface ArtSpec {
  /** Deterministic seed so the same card always renders the same art. */
  seed: number
  /** Restrained tint family. Lime stays dominant across the app. */
  hue: 'lime' | 'dusk' | 'ocean' | 'ember' | 'night'
  /** Motif drawn over the gradient. */
  motif: 'skyline' | 'wave' | 'grid' | 'orbs' | 'route'
}

export type NewsCategory = 'local' | 'world' | 'business' | 'sports' | 'culture'

export interface NewsStory {
  id: string
  slug: string
  category: NewsCategory
  kicker: string
  headline: string
  summary: string
  keyPoints: string[]
  /** Fictional outlet name — never a real publisher. */
  source: string
  publishedAgoMinutes: number
  readMinutes: number
  featured?: boolean
  art: ArtSpec
  demo: true
}

export type EntertainmentCategory = 'events' | 'movies-tv' | 'culture' | 'food' | 'nightlife'

export interface EntertainmentItem {
  id: string
  slug: string
  category: EntertainmentCategory
  title: string
  blurb: string
  venue?: string
  neighborhood: string
  when?: string
  tag?: 'Trending' | 'New' | 'This weekend' | 'Tonight'
  hasTrailer?: boolean
  featured?: boolean
  art: ArtSpec
  demo: true
}

export interface NearbyEvent {
  id: string
  title: string
  venue: string
  when: string
  demo: true
}

export interface Track {
  id: string
  title: string
  artist: string
  durationSec: number
  art: ArtSpec
  demo: true
}

export interface MusicCard {
  id: string
  kind: 'playlist' | 'artist-spotlight' | 'scene'
  title: string
  description: string
  meta: string
  art: ArtSpec
  demo: true
}

export interface VibeOption {
  id: string
  label: string
}

export type LivePulseKind = 'weather' | 'transit' | 'traffic' | 'music' | 'culture'

export interface LivePulseItem {
  id: string
  kind: LivePulseKind
  title: string
  detail: string
  demo: true
}

export interface CommunityAnnouncement {
  id: string
  title: string
  org: string
  when: string
  blurb: string
  /** One of the approved CTAs from the brand package. */
  cta: string
  demo: true
}

export type SponsorSlot = 'attract' | 'home' | 'news' | 'entertainment' | 'joyride'

export interface SponsoredPlacement {
  id: string
  slot: SponsorSlot
  /** Fictional advertiser name — real businesses must never appear as sponsors. */
  advertiser: string
  headline: string
  offer: string
  cta: string
  /** Key into brand sponsorshipLabels — the visible label. */
  labelKey: 'sponsored' | 'featuredPartner' | 'promotedExperience' | 'communitySponsor'
  art: ArtSpec
  fictional: true
  demo: true
}

export interface GameCard {
  id: string
  key: 'city-trivia' | 'quick-quiz' | 'would-you-rather' | 'spot-the-landmark'
  title: string
  blurb: string
  duration: string
  players: string
  playable: boolean
}

export interface TriviaQuestion {
  id: string
  prompt: string
  options: [string, string, string, string]
  correctIndex: 0 | 1 | 2 | 3
  funFact: string
}

export interface SideQuest {
  id: string
  slug: string
  title: string
  goal: string
  durationMin: number
  stops: number
  energy: 'Chill' | 'Medium' | 'High'
  blurb: string
  stopsPreview: string[]
  /** Demo reward concept only — no real fulfillment. */
  reward: string
  sponsoredLabel?: 'sponsoredSideQuest'
  sponsorName?: string
  art: ArtSpec
  demo: true
}
