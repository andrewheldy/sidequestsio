import { useEffect } from 'react'
import { cta, sponsorshipLabels } from '../brand'
import type { SideQuest } from '../data/types.ts'
import { track } from '../lib/analytics.ts'
import { Button } from './Button.tsx'
import { CardArt } from './CardArt.tsx'
import { Icon } from './Icon.tsx'
import { Modal } from './Modal.tsx'

interface SideQuestModalProps {
  quest: SideQuest | null
  onClose: () => void
  onSendToPhone: (quest: SideQuest) => void
}

/** SideQuest detail: goal, stats, stop preview, demo reward, phone handoff. */
export function SideQuestModal({ quest, onClose, onSendToPhone }: SideQuestModalProps) {
  useEffect(() => {
    if (quest) track('sidequest_opened', { contentId: quest.id })
  }, [quest])

  if (!quest) return null

  const stats: Array<[string, string]> = [
    ['Duration', `${quest.durationMin} min`],
    ['Stops', String(quest.stops)],
    ['Energy', quest.energy],
  ]

  return (
    <Modal open onClose={onClose} labelledBy="sidequest-title" testId="sidequest-detail">
      <div className="relative h-36">
        <CardArt art={quest.art} scrim />
        <p className="absolute bottom-3 left-6 flex items-center gap-2 text-[13px] font-semibold tracking-[0.18em] text-pulse-lime uppercase">
          <Icon name="route" size={15} />
          SideQuest
          {quest.sponsoredLabel ? (
            <span className="rounded border border-border-strong px-1.5 py-px text-[10.5px] tracking-[0.1em] text-static-gray normal-case">
              {sponsorshipLabels[quest.sponsoredLabel]}
              {quest.sponsorName ? ` · ${quest.sponsorName}` : ''} · {sponsorshipLabels.demoPlacement}
            </span>
          ) : null}
        </p>
      </div>
      <div className="flex flex-col gap-4 p-6 pt-4">
        <h2 id="sidequest-title" className="font-display text-3xl leading-tight font-bold text-signal-white">
          {quest.title}
        </h2>
        <p className="max-w-2xl text-lg leading-relaxed text-signal-white/90">{quest.goal}</p>
        <div className="flex gap-2.5">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border-thin bg-feed-black/50 px-4 py-2">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-static-gray uppercase">{label}</p>
              <p className="text-lg font-bold text-signal-white">{value}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="pb-2 text-[13px] font-bold tracking-[0.16em] text-static-gray uppercase">
            On the route
          </p>
          <ul className="flex flex-col gap-2">
            {quest.stopsPreview.map((stop, i) => (
              <li key={stop} className="flex items-center gap-3 text-base text-signal-white/90">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-graphite text-[13px] font-bold text-pulse-lime">
                  {i + 1}
                </span>
                {stop}
                {i < quest.stopsPreview.length - 1 ? null : (
                  <span className="text-[13px] text-static-gray">· +{quest.stops - quest.stopsPreview.length} more</span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <p className="rounded-xl border border-border-thin bg-lime-soft px-4 py-3 text-[15px] text-signal-white">
          <span className="font-semibold text-pulse-lime">Reward · </span>
          {quest.reward}
        </p>
        <div className="flex flex-wrap items-center gap-3 border-t border-border-thin pt-4">
          <Button variant="primary" icon="phone" onClick={() => onSendToPhone(quest)} data-testid="sidequest-send">
            {cta.sendToPhone}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Maybe later
          </Button>
        </div>
        <p className="text-xs text-static-gray/70">
          SideQuests continue on your phone — the tablet stays in the car.
        </p>
      </div>
    </Modal>
  )
}
