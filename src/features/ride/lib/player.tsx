import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { queue } from '../data'
import type { Track } from '../data/types.ts'

/**
 * Simulated music player. No audio is loaded or streamed — progress advances
 * against track metadata only, which keeps the prototype honest about rights.
 */
interface PlayerContextValue {
  track: Track
  trackIndex: number
  playing: boolean
  positionSec: number
  toggle: () => void
  next: () => void
  prev: () => void
}

const PlayerContext = createContext<PlayerContextValue | null>(null)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [trackIndex, setTrackIndex] = useState(0)
  const [positionSec, setPositionSec] = useState(72)
  const [playing, setPlaying] = useState(false)

  const currentTrack = queue[trackIndex % queue.length]!

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setPositionSec((pos) => {
        if (pos + 1 >= currentTrack.durationSec) {
          setTrackIndex((i) => (i + 1) % queue.length)
          return 0
        }
        return pos + 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [playing, currentTrack.durationSec])

  const toggle = useCallback(() => setPlaying((p) => !p), [])
  const next = useCallback(() => {
    setTrackIndex((i) => (i + 1) % queue.length)
    setPositionSec(0)
  }, [])
  const prev = useCallback(() => {
    setTrackIndex((i) => (i - 1 + queue.length) % queue.length)
    setPositionSec(0)
  }, [])

  const value = useMemo(
    () => ({ track: currentTrack, trackIndex, playing, positionSec, toggle, next, prev }),
    [currentTrack, trackIndex, playing, positionSec, toggle, next, prev],
  )
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider')
  return ctx
}
