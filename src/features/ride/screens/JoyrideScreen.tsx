import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { joyride } from '../brand'
import { gameCards, sideQuests, sponsorForSlot } from '../data'
import type { GameCard, SideQuest } from '../data/types.ts'
import { sendToPhone } from '../lib/handoffClient.ts'
import type { HandoffRecord } from '../lib/handoff.ts'
import { useEnsureSession } from '../lib/useEnsureSession.ts'
import { Button } from '../components/Button.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { Icon } from '../components/Icon.tsx'
import type { IconName } from '../components/Icon.tsx'
import { ModuleHeader } from '../components/TopNav.tsx'
import { QrModal } from '../components/QrModal.tsx'
import { ScreenScaffold } from '../components/ScreenScaffold.tsx'
import { SideQuestCard } from '../components/SideQuestCard.tsx'
import { SideQuestModal } from '../components/SideQuestModal.tsx'
import { SponsoredCard } from '../components/SponsoredCard.tsx'
import { TriviaGame } from '../components/TriviaGame.tsx'

const GAME_ICONS: Record<GameCard['key'], IconName> = {
  'city-trivia': 'buildings',
  'quick-quiz': 'lightning',
  'would-you-rather': 'question',
  'spot-the-landmark': 'camera',
}

function GameCardTile({
  game,
  selected,
  onSelect,
}: {
  game: GameCard
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-testid={`game-${game.key}`}
      className={`flex min-h-[72px] w-full cursor-pointer items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-colors ${
        selected
          ? 'border-pulse-lime bg-lime-glow'
          : 'border-border-thin bg-carbon hover:border-border-strong'
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          selected ? 'bg-pulse-lime text-feed-black' : 'bg-feed-black text-pulse-lime'
        }`}
      >
        <Icon name={GAME_ICONS[game.key]} size={22} />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-[17px] leading-tight font-bold tracking-wide text-signal-white uppercase">
          {game.title}
        </span>
        <span className="block text-[13.5px] leading-snug text-static-gray">
          {game.blurb} · {game.duration} · {game.players}
        </span>
      </span>
    </button>
  )
}

/** JOYRIDE — game selection, playable City Trivia, SideQuests, labeled sponsor. */
export function JoyrideScreen() {
  useEnsureSession('joyride')
  const navigate = useNavigate()
  const [selectedGame, setSelectedGame] = useState<GameCard['key']>('city-trivia')
  const [openQuest, setOpenQuest] = useState<SideQuest | null>(null)
  const [handoff, setHandoff] = useState<HandoffRecord | null>(null)
  const sponsor = sponsorForSlot('joyride')

  const sendQuest = (quest: SideQuest) => {
    setHandoff(
      sendToPhone({
        kind: 'sidequest',
        slug: quest.slug,
        title: quest.title,
        detail: quest.goal,
        sponsorLabel: quest.sponsoredLabel
          ? `Sponsored SideQuest${quest.sponsorName ? ` · ${quest.sponsorName}` : ''} · Demo sponsored placement`
          : undefined,
      }),
    )
    setOpenQuest(null)
  }

  return (
    <ScreenScaffold
      header={
        <ModuleHeader
          icon="controller"
          title={joyride.lockup.name}
          subtitle={`${joyride.lockup.by} · ${joyride.subtitle}`}
          onBack={() => navigate('/ride')}
        />
      }
    >
      <div className="flex flex-col gap-3" data-testid="joyride-screen">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[330px_1fr]">
          {/* Game selection */}
          <div className="flex flex-col gap-2.5" role="group" aria-label="Choose a game">
            {gameCards.map((game) => (
              <GameCardTile
                key={game.id}
                game={game}
                selected={selectedGame === game.key}
                onSelect={() => setSelectedGame(game.key)}
              />
            ))}
            <SponsoredCard
              placement={sponsor}
              variant="panel"
              onSendToPhone={() =>
                setHandoff(
                  sendToPhone({
                    kind: 'offer',
                    slug: sponsor.id,
                    title: `${sponsor.advertiser} — ${sponsor.offer}`,
                    detail: sponsor.headline,
                    sponsorLabel: 'Promoted experience · Demo sponsored placement',
                  }),
                )
              }
            />
          </div>

          {/* Active game panel */}
          <div className="min-h-[420px]">
            {selectedGame === 'city-trivia' ? (
              <TriviaGame />
            ) : (
              <EmptyState
                icon={GAME_ICONS[selectedGame]}
                title="Still in the shop"
                detail="This one is coming in a future ride. City Trivia is ready right now."
                action={
                  <Button variant="primary" onClick={() => setSelectedGame('city-trivia')}>
                    Play City Trivia
                  </Button>
                }
              />
            )}
          </div>
        </div>

        {/* SideQuests */}
        <section aria-label="SideQuests">
          <h3 className="px-1 pb-2 text-[13px] font-bold tracking-[0.18em] text-static-gray uppercase">
            SideQuests <span className="text-signal-white">near you</span>
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {sideQuests.map((quest) => (
              <SideQuestCard key={quest.id} quest={quest} onOpen={() => setOpenQuest(quest)} />
            ))}
          </div>
        </section>
      </div>

      <SideQuestModal quest={openQuest} onClose={() => setOpenQuest(null)} onSendToPhone={sendQuest} />
      <QrModal record={handoff} onClose={() => setHandoff(null)} />
    </ScreenScaffold>
  )
}
