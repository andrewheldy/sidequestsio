import { formatDuration } from '../lib/format.ts'
import { usePlayer } from '../lib/player.tsx'
import { usePrefs } from '../lib/prefs.tsx'
import { CardArt } from './CardArt.tsx'
import { Icon } from './Icon.tsx'

interface MusicPlayerProps {
  variant?: 'bar' | 'panel'
}

/**
 * Simulated player — transport and progress work; no audio ever plays.
 * The bar variant matches the Home composition; panel is used on MUSIC.
 */
export function MusicPlayer({ variant = 'bar' }: MusicPlayerProps) {
  const { track, playing, positionSec, toggle, next, prev } = usePlayer()
  const { prefs } = usePrefs()
  const progress = Math.min(positionSec / track.durationSec, 1)

  const transport = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Previous track"
        onClick={prev}
        className="inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-xl text-signal-white transition-colors hover:bg-white/5 active:bg-white/10"
      >
        <Icon name="prev" size={20} />
      </button>
      <button
        type="button"
        aria-label={playing ? 'Pause' : 'Play'}
        data-testid="player-toggle"
        onClick={toggle}
        className="inline-flex h-13 w-13 cursor-pointer items-center justify-center rounded-full bg-pulse-lime text-feed-black transition-transform hover:scale-105 active:scale-95"
      >
        <Icon name={playing ? 'pause' : 'play'} size={22} />
      </button>
      <button
        type="button"
        aria-label="Next track"
        onClick={next}
        className="inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-xl text-signal-white transition-colors hover:bg-white/5 active:bg-white/10"
      >
        <Icon name="next" size={20} />
      </button>
    </div>
  )

  const progressBar = (
    <div
      role="progressbar"
      aria-label="Track progress"
      aria-valuemin={0}
      aria-valuemax={track.durationSec}
      aria-valuenow={positionSec}
      className="h-1.5 w-full overflow-hidden rounded-full bg-graphite"
    >
      <div
        className="h-full rounded-full bg-pulse-lime transition-[width] duration-300"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  )

  if (variant === 'panel') {
    return (
      <section
        aria-label="Music player"
        data-testid="music-player"
        className="flex flex-col gap-4 rounded-2xl border border-border-thin bg-carbon p-5"
      >
        <div className="flex items-center gap-4">
          <span className="block h-20 w-20 shrink-0 overflow-hidden rounded-xl">
            <CardArt art={track.art} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold tracking-[0.16em] text-pulse-lime uppercase">
              Now playing · sample track
            </p>
            <p className="truncate font-display text-2xl font-bold text-signal-white" data-testid="player-track-title">
              {track.title}
            </p>
            <p className="truncate text-base text-static-gray">{track.artist}</p>
          </div>
          {transport}
        </div>
        <div className="flex items-center gap-3">
          <span className="w-12 text-right text-[13px] font-medium text-static-gray tabular-nums">
            {formatDuration(positionSec)}
          </span>
          {progressBar}
          <span className="w-12 text-[13px] font-medium text-static-gray tabular-nums">
            {formatDuration(track.durationSec)}
          </span>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-label="Music player"
      data-testid="music-player"
      className="flex items-center gap-4 rounded-2xl border border-border-thin bg-carbon px-4 py-2.5"
    >
      <span className="block h-12 w-12 shrink-0 overflow-hidden rounded-lg">
        <CardArt art={track.art} />
      </span>
      <div className="w-40 min-w-0 shrink-0">
        <p className="truncate text-[15px] leading-tight font-semibold text-signal-white" data-testid="player-track-title">
          {track.title}
        </p>
        <p className="truncate text-[13px] leading-tight text-static-gray">
          {track.artist} · sample
        </p>
      </div>
      {transport}
      <span className="w-12 text-right text-[13px] font-medium text-static-gray tabular-nums">
        {formatDuration(positionSec)}
      </span>
      <div className="min-w-0 flex-1">{progressBar}</div>
      <span className="w-12 text-[13px] font-medium text-static-gray tabular-nums">
        {formatDuration(track.durationSec)}
      </span>
      <span className="hidden shrink-0 items-center gap-1 text-static-gray lg:flex" aria-hidden="true">
        <Icon name={prefs.volume === 0 ? 'volumeMuted' : 'volume'} size={18} />
        <span className="text-[13px] font-medium">{prefs.volume}</span>
      </span>
    </section>
  )
}
