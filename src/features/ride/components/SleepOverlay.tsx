import { useSession } from '../lib/session.tsx'

/**
 * Sleep mode: near-black, no ambient animation, whole surface wakes the screen.
 * Riders always control wake.
 */
export function SleepOverlay() {
  const { sleeping, wake } = useSession()
  if (!sleeping) return null
  return (
    <button
      type="button"
      onClick={wake}
      data-testid="sleep-overlay"
      className="fixed inset-0 z-[70] block h-full w-full cursor-pointer bg-feed-black"
    >
      <span className="text-base font-medium text-static-gray/70">Tap to wake</span>
    </button>
  )
}
