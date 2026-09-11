import { cta } from '../brand/copy.ts'
import type { CommunityAnnouncement } from './types.ts'

/** Fictional sample community announcements — organizations are invented. */
export const communityAnnouncements: CommunityAnnouncement[] = [
  {
    id: 'community-shoreline-cleanup',
    title: 'Shoreline cleanup, North Beach',
    org: 'Shoreline Alliance',
    when: 'Sat · 9 AM',
    blurb: 'Gloves and bags provided. Two hours, coffee after, sunscreen strongly advised.',
    cta: cta.joinCommunity,
    demo: true,
  },
  {
    id: 'community-mural-day',
    title: 'Community mural day',
    org: 'Walls for All',
    when: 'Sun · 10 AM',
    blurb: 'Help prime three walls in Allapattah before festival week. No experience needed.',
    cta: cta.joinCommunity,
    demo: true,
  },
  {
    id: 'community-new-to-miami',
    title: 'New to Miami meetup',
    org: 'Magic City Welcome Club',
    when: 'Thu · 7 PM',
    blurb: 'Low-key intros at the riverfront pavilion. First round of cafecito is on the club.',
    cta: cta.joinCommunity,
    demo: true,
  },
  {
    id: 'community-food-drive',
    title: 'Neighborhood food drive',
    org: 'Isla Verde Neighbors Fund',
    when: 'All week',
    blurb: 'Drop shelf-stable goods at five collection points across Little Havana.',
    cta: cta.joinCommunity,
    demo: true,
  },
  {
    id: 'community-park-concert',
    title: 'Free concert in the park',
    org: 'Riverside Arts Trust',
    when: 'Sun · 6 PM',
    blurb: 'Student big band plays the bandshell. Bring a blanket; food trucks on site.',
    cta: cta.joinCommunity,
    demo: true,
  },
]
