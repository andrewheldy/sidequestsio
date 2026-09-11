/**
 * Deterministic QR-style placeholder pattern. This is a visual stand-in for a
 * real QR code (the prototype has no backend to serve scannable URLs); the UI
 * labels it as a demo and offers an equivalent on-screen link.
 */
import { hashString, mulberry32 } from './rand.ts'

export const QR_SIZE = 21

const FINDER_ZONES: Array<[number, number]> = [
  [0, 0],
  [QR_SIZE - 7, 0],
  [0, QR_SIZE - 7],
]

function finderZoneAt(x: number, y: number): [number, number] | null {
  for (const [zx, zy] of FINDER_ZONES) {
    if (x >= zx && x < zx + 7 && y >= zy && y < zy + 7) return [zx, zy]
  }
  return null
}

function finderModule(lx: number, ly: number): boolean {
  const ring = lx === 0 || lx === 6 || ly === 0 || ly === 6
  const core = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4
  return ring || core
}

/** Returns a QR_SIZE×QR_SIZE boolean matrix, stable for a given token. */
export function qrMatrix(token: string): boolean[][] {
  const rand = mulberry32(hashString(token))
  const rows: boolean[][] = []
  for (let y = 0; y < QR_SIZE; y++) {
    const row: boolean[] = []
    for (let x = 0; x < QR_SIZE; x++) {
      const zone = finderZoneAt(x, y)
      row.push(zone ? finderModule(x - zone[0], y - zone[1]) : rand() > 0.52)
    }
    rows.push(row)
  }
  return rows
}
