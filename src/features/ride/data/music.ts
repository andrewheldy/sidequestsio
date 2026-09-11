import type { MusicCard, Track, VibeOption } from './types.ts'

/**
 * Fictional sample music content. No audio is streamed anywhere in the prototype —
 * the player simulates progress against metadata only.
 */
export const queue: Track[] = [
  {
    id: 'track-orilla',
    title: 'Orilla',
    artist: 'Río Neón',
    durationSec: 243,
    art: { seed: 5, hue: 'lime', motif: 'wave' },
    demo: true,
  },
  {
    id: 'track-calle-luz',
    title: 'Calle Luz',
    artist: 'Vela Sur',
    durationSec: 201,
    art: { seed: 17, hue: 'dusk', motif: 'orbs' },
    demo: true,
  },
  {
    id: 'track-causeway',
    title: 'Causeway',
    artist: 'Glass Tide',
    durationSec: 224,
    art: { seed: 59, hue: 'ocean', motif: 'route' },
    demo: true,
  },
  {
    id: 'track-84-east',
    title: '84 East',
    artist: 'Mango Static',
    durationSec: 189,
    art: { seed: 61, hue: 'ember', motif: 'grid' },
    demo: true,
  },
]

export const musicCards: MusicCard[] = [
  {
    id: 'music-morning-drive',
    kind: 'playlist',
    title: 'Miami Morning Drive',
    description: 'Bright, fast openers for the ride across the causeway.',
    meta: '18 tracks · 1 hr 4 min',
    art: { seed: 3, hue: 'lime', motif: 'wave' },
    demo: true,
  },
  {
    id: 'music-golden-hour',
    kind: 'playlist',
    title: 'Golden Hour 305',
    description: 'Slow horns and warm synths for sunset windows-down blocks.',
    meta: '14 tracks · 52 min',
    art: { seed: 73, hue: 'dusk', motif: 'skyline' },
    demo: true,
  },
  {
    id: 'music-vela-sur',
    kind: 'artist-spotlight',
    title: 'Vela Sur',
    description: 'The Little Havana trio blending bolero guitar with club drums.',
    meta: 'Artist spotlight',
    art: { seed: 79, hue: 'ember', motif: 'orbs' },
    demo: true,
  },
  {
    id: 'music-open-windows',
    kind: 'scene',
    title: 'What Miami is playing',
    description: 'A rolling sample of what rides around the city queued up this week.',
    meta: 'Updated weekly',
    art: { seed: 97, hue: 'ocean', motif: 'grid' },
    demo: true,
  },
]

export const vibeOptions: VibeOption[] = [
  { id: 'vibe-latin-heat', label: 'Latin heat' },
  { id: 'vibe-smooth', label: 'Smooth & slow' },
  { id: 'vibe-classics', label: 'Beach classics' },
  { id: 'vibe-turn-it-up', label: 'Turn it up' },
]
