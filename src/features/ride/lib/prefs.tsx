import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Rider-adjustable accessibility and comfort preferences. Applied as data
 * attributes on <html> so CSS handles the actual behavior. Persisted locally —
 * these are device settings, not rider profiles.
 */
export interface Prefs {
  largerText: boolean
  reducedMotion: boolean
  highContrast: boolean
  volume: number
}

const DEFAULT_PREFS: Prefs = {
  largerText: false,
  reducedMotion: false,
  highContrast: false,
  volume: 60,
}

const STORAGE_KEY = 'feed.prefs.v1'

interface PrefsContextValue {
  prefs: Prefs
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void
}

const PrefsContext = createContext<PrefsContextValue | null>(null)

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFS
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) }
  } catch {
    return DEFAULT_PREFS
  }
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-text-scale', prefs.largerText ? 'large' : 'default')
    root.setAttribute('data-motion', prefs.reducedMotion ? 'reduced' : 'auto')
    root.setAttribute('data-contrast', prefs.highContrast ? 'high' : 'default')
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch {
      // Storage may be unavailable in kiosk/private modes; prefs still apply in-session.
    }
  }, [prefs])

  const setPref = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((prev) => ({ ...prev, [key]: value }))
  }, [])

  const value = useMemo(() => ({ prefs, setPref }), [prefs, setPref])
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs(): PrefsContextValue {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs must be used inside PrefsProvider')
  return ctx
}
