import { cta, sponsorshipLabels } from '../brand'
import type { SideQuest } from '../data/types.ts'
import { useImpression } from '../lib/useImpression.ts'
import { CardArt } from './CardArt.tsx'
import { Icon } from './Icon.tsx'

interface SideQuestCardProps {
  quest: SideQuest
  onOpen: () => void
}

/** SideQuest tile inside JOYRIDE — the signature route-based content type. */
export function SideQuestCard({ quest, onOpen }: SideQuestCardProps) {
  const ref = useImpression<HTMLButtonElement>(quest.id, { surface: 'sidequest' })
  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      data-testid={`sidequest-${quest.slug}`}
      className="group flex w-full cursor-pointer items-stretch gap-3.5 overflow-hidden rounded-xl border border-border-thin bg-carbon p-3 text-left transition-colors hover:border-pulse-lime/50 focus-visible:border-pulse-lime"
    >
      <span className="relative block h-full min-h-[88px] w-24 shrink-0 overflow-hidden rounded-lg">
        <CardArt art={quest.art} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
        <span className="flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.14em] text-pulse-lime uppercase">
          <Icon name="route" size={14} />
          SideQuest
          {quest.sponsoredLabel ? (
            <span className="rounded border border-border-strong px-1.5 py-px text-[10px] tracking-[0.1em] text-static-gray normal-case">
              {sponsorshipLabels[quest.sponsoredLabel]}
            </span>
          ) : null}
        </span>
        <span className="text-[16.5px] leading-snug font-semibold text-signal-white">{quest.title}</span>
        <span className="text-[13px] text-static-gray">
          {quest.durationMin} min · {quest.stops} stops · {quest.energy}
        </span>
        <span className="mt-auto pt-1 text-[14px] font-semibold text-pulse-lime group-hover:text-signal-white">
          {cta.startSideQuest}
        </span>
      </span>
    </button>
  )
}
