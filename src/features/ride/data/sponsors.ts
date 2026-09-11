import { cta } from '../brand/copy.ts'
import type { SponsoredPlacement } from './types.ts'

/**
 * Demo sponsored placements. Every advertiser here is FICTIONAL — real businesses
 * must never be portrayed as paying sponsors. Each placement renders an approved
 * sponsorship label plus the "Demo sponsored placement" disclosure.
 */
export const sponsoredPlacements: SponsoredPlacement[] = [
  {
    id: 'sponsor-attract',
    slot: 'attract',
    advertiser: 'Café Solara',
    headline: 'Café Solara',
    offer: 'Cortaditos on the causeway since day one',
    cta: cta.viewDetails,
    labelKey: 'sponsored',
    art: { seed: 101, hue: 'ember', motif: 'orbs' },
    fictional: true,
    demo: true,
  },
  {
    id: 'sponsor-home',
    slot: 'home',
    advertiser: 'Marlin & Vine',
    headline: 'Dinner on the water, minus the wait',
    offer: '15% off your next order',
    cta: cta.claimOffer,
    labelKey: 'sponsored',
    art: { seed: 103, hue: 'ocean', motif: 'wave' },
    fictional: true,
    demo: true,
  },
  {
    id: 'sponsor-entertainment',
    slot: 'entertainment',
    advertiser: 'GlowWash Auto Spa',
    headline: 'Your ride, but shinier',
    offer: '20% off any wash this week',
    cta: cta.sendToPhone,
    labelKey: 'sponsored',
    art: { seed: 107, hue: 'lime', motif: 'grid' },
    fictional: true,
    demo: true,
  },
  {
    id: 'sponsor-joyride',
    slot: 'joyride',
    advertiser: 'Palma Rooftop',
    headline: 'Trivia night, Thursdays at Palma',
    offer: 'Winners drink free until 9',
    // The action is a phone handoff, so the label has to say so. Matching
    // cta.sendToPhone also suppresses the card's duplicate secondary button.
    cta: cta.sendToPhone,
    labelKey: 'promotedExperience',
    art: { seed: 109, hue: 'dusk', motif: 'skyline' },
    fictional: true,
    demo: true,
  },
  {
    id: 'sponsor-news',
    slot: 'news',
    advertiser: 'Isla Verde Neighbors Fund',
    headline: 'Community programming supported by Isla Verde Neighbors Fund',
    offer: 'Around Miami is community-supported',
    cta: cta.joinCommunity,
    labelKey: 'communitySponsor',
    art: { seed: 113, hue: 'lime', motif: 'route' },
    fictional: true,
    demo: true,
  },
]

export function sponsorForSlot(slot: SponsoredPlacement['slot']): SponsoredPlacement {
  const match = sponsoredPlacements.find((p) => p.slot === slot)
  if (!match) throw new Error(`No demo sponsor seeded for slot: ${slot}`)
  return match
}
