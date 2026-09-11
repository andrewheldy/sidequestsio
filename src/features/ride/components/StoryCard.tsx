import { timeAgo } from '../lib/format.ts'
import { useImpression } from '../lib/useImpression.ts'
import type { NewsStory } from '../data/types.ts'
import { CardArt } from './CardArt.tsx'

interface StoryCardProps {
  story: NewsStory
  onOpen: () => void
  variant?: 'row' | 'tile'
}

/** News story card — horizontal row for lists, vertical tile for shelves. */
export function StoryCard({ story, onOpen, variant = 'row' }: StoryCardProps) {
  const ref = useImpression<HTMLButtonElement>(story.id, { surface: variant })

  if (variant === 'tile') {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onOpen}
        data-testid={`story-tile-${story.slug}`}
        className="group flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border-thin bg-carbon text-left transition-colors hover:border-pulse-lime/50 focus-visible:border-pulse-lime"
      >
        <span className="block h-24 w-full overflow-hidden">
          <CardArt art={story.art} />
        </span>
        <span className="flex flex-1 flex-col gap-1 p-3">
          <span className="text-[11.5px] font-semibold tracking-[0.14em] text-pulse-lime uppercase">
            {story.kicker}
          </span>
          <span className="line-clamp-2 text-[15.5px] leading-snug font-semibold text-signal-white">
            {story.headline}
          </span>
          <span className="mt-auto flex flex-col pt-1 text-[12.5px] leading-tight text-static-gray">
            <span className="truncate">{story.source}</span>
            <span>
              {timeAgo(story.publishedAgoMinutes)} · {story.readMinutes} min read
            </span>
          </span>
        </span>
      </button>
    )
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      data-testid={`story-row-${story.slug}`}
      className="group flex w-full cursor-pointer items-stretch gap-3.5 rounded-xl border border-border-thin bg-carbon p-3 text-left transition-colors hover:border-pulse-lime/50 focus-visible:border-pulse-lime"
    >
      <span className="block h-[76px] w-28 shrink-0 overflow-hidden rounded-lg">
        <CardArt art={story.art} />
      </span>
      <span className="flex min-w-0 flex-col justify-center gap-1">
        <span className="text-[11.5px] font-semibold tracking-[0.14em] text-pulse-lime uppercase">
          {story.kicker}
        </span>
        <span className="line-clamp-2 text-base leading-snug font-semibold text-signal-white">
          {story.headline}
        </span>
        <span className="text-[13px] text-static-gray">
          {story.source} · {timeAgo(story.publishedAgoMinutes)} · {story.readMinutes} min read
        </span>
      </span>
    </button>
  )
}
