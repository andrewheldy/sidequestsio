import { useEffect, useRef } from 'react'
import { track } from './analytics.ts'

/**
 * Verified-impression hook: fires `content_impression` only after the element
 * is at least half visible for a full second — an API render never counts.
 */
export function useImpression<T extends HTMLElement>(
  contentId: string,
  props?: Record<string, string | number | boolean>,
) {
  const ref = useRef<T | null>(null)
  const propsRef = useRef(props)

  useEffect(() => {
    propsRef.current = props
  })

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    let timer: ReturnType<typeof setTimeout> | undefined
    let fired = false
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry || fired) return
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          timer = setTimeout(() => {
            fired = true
            track('content_impression', { contentId, ...propsRef.current })
            observer.disconnect()
          }, 1000)
        } else if (timer) {
          clearTimeout(timer)
        }
      },
      { threshold: [0.5] },
    )
    observer.observe(el)
    return () => {
      if (timer) clearTimeout(timer)
      observer.disconnect()
    }
  }, [contentId])

  return ref
}
