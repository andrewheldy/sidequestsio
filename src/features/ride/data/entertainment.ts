import type { EntertainmentItem, NearbyEvent } from './types.ts'

/**
 * Fictional sample entertainment content. Artists, venues, shows, and times are
 * invented — real neighborhoods appear only as editorial geography.
 */
export const entertainmentItems: EntertainmentItem[] = [
  {
    id: 'ent-marisol',
    slug: 'marisol-live-on-the-bay',
    category: 'events',
    title: 'Marisol y La Marea — Live on the Bay',
    blurb:
      'The hometown band closes its tour with an open-air night on the water. A night of horns, salt air, and unreasonable energy.',
    venue: 'Seawall Stage',
    neighborhood: 'Downtown',
    when: 'Sat · May 31 · 8 PM',
    tag: 'This weekend',
    featured: true,
    hasTrailer: true,
    art: { seed: 7, hue: 'dusk', motif: 'orbs' },
    demo: true,
  },
  {
    id: 'ent-tide-line',
    slug: 'tide-line-season-two',
    category: 'movies-tv',
    title: 'Tide Line, season two',
    blurb: 'The Miami-shot detective series returns. First two episodes streaming now.',
    neighborhood: 'Filmed across Miami',
    tag: 'New',
    hasTrailer: true,
    art: { seed: 13, hue: 'night', motif: 'skyline' },
    demo: true,
  },
  {
    id: 'ent-reef-cinema',
    slug: 'reef-open-air-cinema',
    category: 'movies-tv',
    title: 'Open-air cinema on the sand',
    blurb: 'Classic films on a 40-foot screen at the water line. Blankets welcome, tickets free.',
    venue: 'North Shore lawn',
    neighborhood: 'Miami Beach',
    when: 'Fri · Sundown',
    art: { seed: 19, hue: 'ocean', motif: 'wave' },
    demo: true,
  },
  {
    id: 'ent-gallery-crawl',
    slug: 'second-saturday-gallery-crawl',
    category: 'culture',
    title: 'Second Saturday gallery crawl',
    blurb: 'A dozen galleries, one free trolley loop, and street food until late.',
    neighborhood: 'Wynwood',
    when: 'Sat · 6–11 PM',
    tag: 'Trending',
    art: { seed: 29, hue: 'ember', motif: 'grid' },
    demo: true,
  },
  {
    id: 'ent-havana-crawl',
    slug: 'little-havana-food-crawl',
    category: 'food',
    title: 'Little Havana food crawl',
    blurb: 'Five stops, one afternoon: cafecito, croquetas, and the best window counters on Calle Ocho.',
    neighborhood: 'Little Havana',
    when: 'Daily · 2–6 PM',
    art: { seed: 31, hue: 'ember', motif: 'route' },
    demo: true,
  },
  {
    id: 'ent-rooftop-season',
    slug: 'rooftop-season-opener',
    category: 'nightlife',
    title: 'Rooftop season opens across Brickell',
    blurb: 'Six rooftops flip on for the season this week — sunset sets, late kitchens, skyline views.',
    neighborhood: 'Brickell',
    when: 'This week',
    tag: 'Tonight',
    art: { seed: 43, hue: 'dusk', motif: 'skyline' },
    demo: true,
  },
  {
    id: 'ent-jazz-plaza',
    slug: 'jazz-on-the-plaza',
    category: 'culture',
    title: 'Jazz on the plaza',
    blurb: 'A free outdoor quartet series every Sunday evening, rain or shine.',
    venue: 'Riverside Plaza',
    neighborhood: 'Downtown',
    when: 'Sun · 7 PM',
    art: { seed: 47, hue: 'night', motif: 'orbs' },
    demo: true,
  },
]

export const nearbyEvents: NearbyEvent[] = [
  {
    id: 'nearby-gallery-night',
    title: 'Wynwood gallery night',
    venue: 'NW 2nd Ave corridor',
    when: 'Sat · 6 PM',
    demo: true,
  },
  {
    id: 'nearby-jazz',
    title: 'Jazz on the plaza',
    venue: 'Riverside Plaza',
    when: 'Sun · 7 PM',
    demo: true,
  },
  {
    id: 'nearby-market',
    title: 'Brickell open-air market',
    venue: 'Mary Brickell Green',
    when: 'Fri · 5 PM',
    demo: true,
  },
]

export const featuredEntertainment: EntertainmentItem =
  entertainmentItems.find((e) => e.featured) ?? entertainmentItems[0]!
