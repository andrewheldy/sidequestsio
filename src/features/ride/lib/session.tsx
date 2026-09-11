import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { rotateAnalyticsSession, track } from './analytics.ts'

/**
 * Anonymous rider session state: has the rider tapped in, and is the screen
 * asleep. No identity — just an ephemeral flag plus analytics markers.
 */
interface SessionContextValue {
  started: boolean
  sleeping: boolean
  start: () => void
  sleep: () => void
  wake: () => void
  reset: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [started, setStarted] = useState(false)
  const [sleeping, setSleeping] = useState(false)

  const start = useCallback(() => {
    setStarted((prev) => {
      if (!prev) {
        rotateAnalyticsSession()
        track('session_started')
      }
      return true
    })
  }, [])

  const sleep = useCallback(() => {
    setSleeping(true)
    track('screen_slept')
  }, [])

  const wake = useCallback(() => {
    setSleeping(false)
    track('screen_woke')
  }, [])

  const reset = useCallback(() => {
    setStarted(false)
    setSleeping(false)
  }, [])

  const value = useMemo(
    () => ({ started, sleeping, start, sleep, wake, reset }),
    [started, sleeping, start, sleep, wake, reset],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
