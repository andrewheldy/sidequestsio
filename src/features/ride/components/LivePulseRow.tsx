import { demoDisclosure } from '../brand'
import { livePulseItems } from '../data'
import type { LivePulseKind } from '../data/types.ts'
import { Icon } from './Icon.tsx'
import type { IconName } from './Icon.tsx'

const KIND_ICONS: Record<LivePulseKind, IconName> = {
  weather: 'cloud',
  transit: 'send',
  traffic: 'car',
  music: 'musicNote',
  culture: 'sparkle',
}

/** The Live Pulse strip — a compact utility snapshot of the city right now. */
export function LivePulseRow() {
  return (
    <section
      aria-label="Live Pulse"
      data-testid="live-pulse"
      className="flex items-stretch overflow-hidden rounded-2xl border border-border-thin bg-carbon"
    >
      <div className="flex shrink-0 flex-col items-center justify-center gap-0.5 border-r border-border-thin bg-lime-soft px-4">
        <span className="flex items-center gap-1.5 text-[12px] font-bold tracking-[0.18em] text-pulse-lime uppercase">
          <span
            className="h-1.5 w-1.5 rounded-full bg-pulse-lime"
            style={{ animation: 'feed-live-dot 2s ease-in-out infinite' }}
          />
          Live
        </span>
        <span className="text-[12px] font-semibold tracking-[0.18em] text-signal-white uppercase">
          Pulse
        </span>
        {/* The LIVE treatment must never imply verified live feeds in the prototype. */}
        <span
          className="text-[10px] leading-tight font-medium tracking-[0.06em] text-static-gray"
          data-testid="live-pulse-disclosure"
        >
          {demoDisclosure.sampleData}
        </span>
      </div>
      <ul className="flex flex-1 items-stretch divide-x divide-(--feed-border) overflow-x-auto">
        {livePulseItems.map((item) => (
          <li key={item.id} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5">
            <span className="shrink-0 text-static-gray">
              <Icon name={KIND_ICONS[item.kind]} size={20} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[14.5px] leading-tight font-semibold text-signal-white">
                {item.title}
              </span>
              <span className="block truncate text-[12.5px] leading-tight text-static-gray">
                {item.detail}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
