import { useSyncExternalStore } from 'react'

/** Session-local "save for later" store — anonymous, in-memory only. */
const savedIds = new Set<string>()
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function useSaved(id: string): [boolean, () => void] {
  const saved = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => savedIds.has(id),
  )
  const toggle = () => {
    if (savedIds.has(id)) savedIds.delete(id)
    else savedIds.add(id)
    emit()
  }
  return [saved, toggle]
}
