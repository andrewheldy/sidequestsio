import { useId } from 'react'
import { colors } from '../brand'
import { mulberry32 } from '../lib/rand.ts'
import type { ArtSpec } from '../data/types.ts'

/**
 * Deterministic abstract "city light" art used instead of photography.
 * The prototype has no licensed photo library, so cards get consistent
 * gradient-plus-motif treatments (addendum-approved). Pulse Lime stays the
 * dominant accent; dusk/ember tints are art-only and low-opacity.
 */
const HUES: Record<ArtSpec['hue'], { from: string; to: string; accent: string }> = {
  lime: { from: '#0a1004', to: '#141d07', accent: colors.pulseLime },
  dusk: { from: '#0d0916', to: '#1b1230', accent: '#9f8bff' },
  ocean: { from: '#04121c', to: '#0a2436', accent: colors.info },
  ember: { from: '#170c06', to: '#2a150c', accent: '#ff9a5f' },
  night: { from: '#07080a', to: '#141720', accent: colors.staticGray },
}

const W = 400
const H = 240

function Skyline({ rand, accent }: { rand: () => number; accent: string }) {
  const buildings: Array<{ x: number; w: number; h: number }> = []
  let x = -10
  while (x < W + 10) {
    const w = 24 + rand() * 46
    buildings.push({ x, w, h: 40 + rand() * 110 })
    x += w + 4
  }
  return (
    <g>
      {buildings.map((b, i) => (
        <rect key={i} x={b.x} y={H - b.h} width={b.w} height={b.h} fill="#000" opacity={0.45} />
      ))}
      {buildings.flatMap((b, i) => {
        const windows = []
        const count = 2 + Math.floor(rand() * 4)
        for (let j = 0; j < count; j++) {
          windows.push(
            <rect
              key={`${i}-${j}`}
              x={b.x + 4 + rand() * (b.w - 12)}
              y={H - b.h + 8 + rand() * (b.h - 26)}
              width={4}
              height={6}
              fill={accent}
              opacity={0.35 + rand() * 0.4}
            />,
          )
        }
        return windows
      })}
    </g>
  )
}

function Wave({ rand, accent }: { rand: () => number; accent: string }) {
  const paths = [0, 1, 2].map((i) => {
    const yBase = 70 + i * 55 + rand() * 18
    const amp = 14 + rand() * 22
    let d = `M-10 ${yBase}`
    for (let x = 0; x <= W + 40; x += 80) {
      const dir = (x / 80) % 2 === 0 ? 1 : -1
      d += ` q 40 ${dir * amp} 80 0`
    }
    return { d, opacity: 0.5 - i * 0.14, width: 2.5 - i * 0.5 }
  })
  return (
    <g fill="none" stroke={accent} strokeLinecap="round">
      {paths.map((p, i) => (
        <path key={i} d={p.d} opacity={p.opacity} strokeWidth={p.width} />
      ))}
    </g>
  )
}

function Grid({ rand, accent }: { rand: () => number; accent: string }) {
  const rows = [110, 140, 168, 194, 218]
  const cols = Array.from({ length: 11 }, (_, i) => i * 40)
  return (
    <g>
      {rows.map((y, i) => (
        <line key={`r${i}`} x1={0} y1={y} x2={W} y2={y} stroke={accent} opacity={0.14} />
      ))}
      {cols.map((x, i) => {
        const spread = (x - W / 2) * 0.55
        return (
          <line
            key={`c${i}`}
            x1={W / 2 + spread}
            y1={110}
            x2={W / 2 + spread * 2.4}
            y2={H}
            stroke={accent}
            opacity={0.12}
          />
        )
      })}
      {Array.from({ length: 7 }, (_, i) => (
        <circle
          key={`d${i}`}
          cx={rand() * W}
          cy={20 + rand() * 80}
          r={1.5 + rand() * 2}
          fill={accent}
          opacity={0.4 + rand() * 0.3}
        />
      ))}
    </g>
  )
}

function Orbs({ rand, accent }: { rand: () => number; accent: string }) {
  return (
    <g>
      {Array.from({ length: 6 }, (_, i) => {
        const r = 16 + rand() * 44
        return (
          <circle
            key={i}
            cx={rand() * W}
            cy={rand() * H}
            r={r}
            fill={accent}
            opacity={0.05 + rand() * 0.1}
          />
        )
      })}
      {Array.from({ length: 4 }, (_, i) => (
        <circle
          key={`s${i}`}
          cx={rand() * W}
          cy={rand() * H}
          r={2 + rand() * 3}
          fill={accent}
          opacity={0.5}
        />
      ))}
    </g>
  )
}

function RouteMotif({ rand, accent }: { rand: () => number; accent: string }) {
  const midX = 120 + rand() * 160
  const midY = 60 + rand() * 120
  const d = `M 30 ${H - 40} Q ${midX} ${midY + 60} ${midX + 40} ${midY} T ${W - 40} 50`
  return (
    <g fill="none">
      <path d={d} stroke={accent} strokeWidth={2.5} strokeDasharray="2 10" strokeLinecap="round" opacity={0.55} />
      <circle cx={30} cy={H - 40} r={6} fill={accent} opacity={0.9} />
      <circle cx={W - 40} cy={50} r={6} fill="none" stroke={accent} strokeWidth={2.5} opacity={0.9} />
    </g>
  )
}

interface CardArtProps {
  art: ArtSpec
  className?: string
  /** Bottom scrim for text overlaid on the art. */
  scrim?: boolean
}

export function CardArt({ art, className = '', scrim = false }: CardArtProps) {
  const gradId = useId()
  const { from, to, accent } = HUES[art.hue]
  const rand = mulberry32(art.seed)
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={`block h-full w-full ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${gradId}-bg`} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
        <linearGradient id={`${gradId}-scrim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="35%" stopColor="#050706" stopOpacity="0" />
          <stop offset="100%" stopColor="#050706" stopOpacity="0.88" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${gradId}-bg)`} />
      {art.motif === 'skyline' && <Skyline rand={rand} accent={accent} />}
      {art.motif === 'wave' && <Wave rand={rand} accent={accent} />}
      {art.motif === 'grid' && <Grid rand={rand} accent={accent} />}
      {art.motif === 'orbs' && <Orbs rand={rand} accent={accent} />}
      {art.motif === 'route' && <RouteMotif rand={rand} accent={accent} />}
      {scrim ? <rect width={W} height={H} fill={`url(#${gradId}-scrim)`} /> : null}
    </svg>
  )
}
