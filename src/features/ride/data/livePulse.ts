import type { LivePulseItem } from './types.ts'

/**
 * Live Pulse row — sample utility snapshot. Values are static demo placeholders,
 * never presented as verified live data.
 */
export const livePulseItems: LivePulseItem[] = [
  {
    id: 'pulse-weather',
    kind: 'weather',
    title: '82° Partly cloudy',
    detail: 'Miami · light breeze off the bay',
    demo: true,
  },
  {
    id: 'pulse-transit',
    kind: 'transit',
    title: 'MIA Airport',
    detail: 'No major delays · departures normal',
    demo: true,
  },
  {
    id: 'pulse-traffic',
    kind: 'traffic',
    title: 'I-95 South',
    detail: 'Moderate near downtown',
    demo: true,
  },
  {
    id: 'pulse-music',
    kind: 'music',
    title: 'Now playing',
    detail: 'Orilla · Río Neón',
    demo: true,
  },
  {
    id: 'pulse-culture',
    kind: 'culture',
    title: 'Gallery night',
    detail: 'Wynwood · this weekend',
    demo: true,
  },
]

export const weatherPlaceholder = {
  tempF: 82,
  condition: 'Partly cloudy',
} as const
