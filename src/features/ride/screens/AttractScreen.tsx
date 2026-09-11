import { idleScreen, product, sponsorshipLabels } from '../brand'
import { sponsorForSlot } from '../data'
import { useClock } from '../lib/useClock.ts'
import { weatherPlaceholder } from '../data'
import { Icon } from '../components/Icon.tsx'
import { PulseMark } from '../components/FeedLogo.tsx'
import { PulseWave } from '../components/PulseWave.tsx'

/**
 * Cinematic idle screen. The entire surface is one large "begin" control;
 * ambient motion is subtle and freezes cleanly under reduced motion.
 */
export function AttractScreen({ onBegin }: { onBegin: () => void }) {
  const clock = useClock()
  const sponsor = sponsorForSlot('attract')

  return (
    <button
      type="button"
      onClick={onBegin}
      data-testid="attract-screen"
      aria-label={`${product.name} — ${idleScreen.primaryAction}`}
      className="relative block h-full w-full cursor-pointer overflow-hidden bg-feed-black text-left"
    >
      {/* Drifting city-light background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-60"
        style={{ animation: 'feed-drift 26s ease-in-out infinite' }}
      >
        <div className="absolute top-[12%] left-[8%] h-72 w-72 rounded-full bg-lime-soft blur-3xl" />
        <div className="absolute right-[12%] bottom-[18%] h-80 w-80 rounded-full bg-[rgba(97,169,255,0.05)] blur-3xl" />
        <div className="absolute top-[45%] left-[55%] h-56 w-56 rounded-full bg-[rgba(159,139,255,0.05)] blur-3xl" />
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-feed-black to-transparent" />

      {/* Clock */}
      <div className="absolute top-8 right-10 text-right">
        <p className="font-display text-4xl font-bold tracking-tight text-signal-white">{clock.time}</p>
        <p className="mt-1 text-[14px] font-medium tracking-[0.22em] text-static-gray">{clock.date}</p>
      </div>

      {/* Center identity */}
      <div className="relative flex h-full flex-col items-center justify-center gap-7 px-10">
        <div className="anim-fade-up flex flex-col items-center gap-5">
          <span className="text-pulse-lime">
            <PulseMark size={64} />
          </span>
          <h1 className="text-center font-display text-[5.5rem] leading-[0.92] font-bold tracking-tight text-signal-white uppercase">
            The <span className="text-pulse-lime">Feed</span>
          </h1>
          <p className="text-center text-2xl text-static-gray">
            The <span className="font-semibold text-pulse-lime">pulse</span> of what is happening
            right now.
          </p>
        </div>

        <div className="w-full max-w-4xl text-pulse-lime">
          <PulseWave className="h-24 w-full" />
        </div>

        <p className="text-[17px] font-bold tracking-[0.3em] text-pulse-lime uppercase">
          {idleScreen.primaryAction}
        </p>
      </div>

      {/* Footer context */}
      <div className="absolute bottom-8 left-10 flex items-center gap-6">
        <span className="flex items-center gap-2 text-lg font-semibold text-signal-white">
          <span className="text-pulse-lime">
            <Icon name="pin" size={20} />
          </span>
          {product.city}
        </span>
        <span className="flex items-center gap-2 text-base text-static-gray">
          <Icon name="cloud" size={20} />
          {weatherPlaceholder.tempF}° · {weatherPlaceholder.condition}
        </span>
      </div>
      <div className="absolute right-10 bottom-8 text-right">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-static-gray uppercase">
          {sponsorshipLabels.sponsored}
        </p>
        <p className="text-lg font-semibold text-signal-white">{sponsor.advertiser}</p>
        <p className="text-[11px] text-static-gray/80">{sponsorshipLabels.demoPlacement}</p>
      </div>
    </button>
  )
}
