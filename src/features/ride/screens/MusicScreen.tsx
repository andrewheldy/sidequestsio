import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { modules } from '../brand'
import { musicCards, vibeOptions } from '../data'
import { useEnsureSession } from '../lib/useEnsureSession.ts'
import { useImpression } from '../lib/useImpression.ts'
import { CardArt } from '../components/CardArt.tsx'
import { ModuleHeader } from '../components/TopNav.tsx'
import { MusicPlayer } from '../components/MusicPlayer.tsx'
import { ScreenScaffold } from '../components/ScreenScaffold.tsx'
import type { MusicCard } from '../data/types.ts'

function MusicCardTile({ card }: { card: MusicCard }) {
  const ref = useImpression<HTMLDivElement>(card.id, { surface: 'music' })
  return (
    <div
      ref={ref}
      className="flex flex-col overflow-hidden rounded-xl border border-border-thin bg-carbon"
    >
      <span className="block h-24 w-full overflow-hidden">
        <CardArt art={card.art} />
      </span>
      <span className="flex flex-1 flex-col gap-1 p-3.5">
        <span className="text-[11.5px] font-semibold tracking-[0.14em] text-pulse-lime uppercase">
          {card.kind === 'playlist' ? 'Playlist' : card.kind === 'artist-spotlight' ? 'Spotlight' : 'Scene'}
        </span>
        <span className="text-[16px] leading-snug font-semibold text-signal-white">{card.title}</span>
        <span className="line-clamp-2 text-[13.5px] leading-snug text-static-gray">
          {card.description}
        </span>
        <span className="mt-auto pt-1.5 text-[12.5px] font-medium text-static-gray/80">{card.meta}</span>
      </span>
    </div>
  )
}

/** MUSIC — simulated player, playlist concepts, and the "pick the vibe" poll. */
export function MusicScreen() {
  useEnsureSession('music')
  const navigate = useNavigate()
  const [vote, setVote] = useState<string | null>(null)

  return (
    <ScreenScaffold
      header={
        <ModuleHeader
          icon="musicNote"
          title={modules.music.name}
          subtitle={modules.music.description}
          onBack={() => navigate('/ride')}
        />
      }
    >
      <div className="flex flex-col gap-3" data-testid="music-screen">
        <MusicPlayer variant="panel" />

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {musicCards.map((card) => (
            <MusicCardTile key={card.id} card={card} />
          ))}
        </div>

        {/* Vibe poll */}
        <section
          aria-label="Pick the next vibe"
          className="rounded-2xl border border-border-thin bg-carbon p-5"
          data-testid="vibe-poll"
        >
          <h3 className="pb-1 font-display text-2xl font-bold text-signal-white">
            Pick the next vibe
          </h3>
          <p className="pb-4 text-base text-static-gray">
            {vote
              ? 'Locked in. The queue leans your way for the rest of the ride.'
              : 'One tap steers what plays next.'}
          </p>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4" role="radiogroup" aria-label="Vibe options">
            {vibeOptions.map((option) => {
              const selected = vote === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setVote(option.id)}
                  data-testid={`vibe-${option.id}`}
                  className={`min-h-13 cursor-pointer rounded-xl border px-4 text-base font-semibold transition-colors ${
                    selected
                      ? 'border-pulse-lime bg-lime-soft text-pulse-lime'
                      : 'border-border-thin text-signal-white hover:border-border-strong'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </section>

        <p className="px-1 text-[13px] text-static-gray/70">
          Sample tracks and metadata only — THE FEED does not stream licensed audio in this
          prototype.
        </p>
      </div>
    </ScreenScaffold>
  )
}
