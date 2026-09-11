import type { SideQuest } from './types.ts'

/**
 * SideQuests — the signature interactive routes inside JOYRIDE.
 * Stops reference real public places editorially; rewards are demo concepts only.
 */
export const sideQuests: SideQuest[] = [
  {
    id: 'sq-wynwood-art',
    slug: 'wynwood-art-route',
    title: 'Wynwood art route',
    goal: 'See five signature walls and one working studio in a single loop.',
    durationMin: 45,
    stops: 6,
    energy: 'Medium',
    blurb: 'A walkable loop through the mural district — start anywhere, finish with a cafecito.',
    stopsPreview: ['NW 2nd Ave gateway wall', 'Open-studio row', 'The long alley murals'],
    reward: 'Demo reward: unlock a Wynwood art badge on your phone.',
    art: { seed: 211, hue: 'ember', motif: 'route' },
    demo: true,
  },
  {
    id: 'sq-little-havana',
    slug: 'little-havana-culture-route',
    title: 'Little Havana culture route',
    goal: 'Walk Calle Ocho from the park to the fruit stand, the classic way.',
    durationMin: 60,
    stops: 5,
    energy: 'Chill',
    blurb: 'Dominoes, cigars rolled by hand, a scoop of mamey — the neighborhood’s greatest hits.',
    stopsPreview: ['Domino Park', 'The walk of stars', 'A classic fruit stand finish'],
    reward: 'Demo reward: unlock a Calle Ocho culture badge.',
    sponsoredLabel: 'sponsoredSideQuest',
    sponsorName: 'Café Solara',
    art: { seed: 223, hue: 'lime', motif: 'route' },
    demo: true,
  },
  {
    id: 'sq-miami-beach-sunset',
    slug: 'miami-beach-sunset-route',
    title: 'Miami Beach sunset route',
    goal: 'Catch golden hour from the boardwalk to the pier before the light goes.',
    durationMin: 40,
    stops: 4,
    energy: 'Chill',
    blurb: 'Timed to the sunset — boardwalk, dune path, pier, and the best free view in town.',
    stopsPreview: ['Boardwalk south entrance', 'The dune overlook', 'South Pointe pier'],
    reward: 'Demo reward: unlock a golden-hour badge.',
    art: { seed: 227, hue: 'dusk', motif: 'wave' },
    demo: true,
  },
]
