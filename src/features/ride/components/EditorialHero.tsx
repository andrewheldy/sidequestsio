import { timeAgo } from '../lib/format.ts'
import { useImpression } from '../lib/useImpression.ts'
import type { NewsStory } from '../data/types.ts'
import { CardArt } from './CardArt.tsx'
import { EqualizerGlyph } from './PulseWave.tsx'

interface EditorialHeroProps {
  story: NewsStory
  onOpen: () => void
}

/**
 * Large editorial hero — the "what is happening right now" anchor of Home.
 * Typography steps down and the summary hides on short viewports (1024×600)
 * so the headline is never clipped.
 */
export function EditorialHero({ story, onOpen }: EditorialHeroProps) {
  const ref = useImpression<HTMLButtonElement>(story.id, { surface: 'hero' })
  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      data-testid="editorial-hero"
      className="group relative block h-full w-full cursor-pointer overflow-hidden rounded-2xl border border-border-thin text-left transition-colors duration-150 hover:border-pulse-lime/50 focus-visible:border-pulse-lime"
    >
      <div className="absolute inset-0">
        <CardArt art={story.art} scrim />
      </div>
      <div className="relative flex h-full flex-col justify-end gap-2 p-5 [@media(min-height:700px)]:p-7">
        <span className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.18em] text-pulse-lime uppercase">
          <EqualizerGlyph size={13} />
          Trending · {story.kicker}
        </span>
        <span className="line-clamp-2 font-display text-2xl leading-[1.05] font-bold tracking-tight text-signal-white [@media(min-height:700px)]:text-[2.6rem]">
          {story.headline}
        </span>
        <span className="hidden max-w-xl text-base leading-snug text-static-gray [@media(min-height:660px)]:block">
          {story.summary}
        </span>
        <span className="mt-2 flex items-center gap-4">
          <span className="inline-flex min-h-11 items-center rounded-xl bg-pulse-lime px-5 text-[15px] font-semibold text-feed-black transition-transform group-hover:scale-[1.02] group-active:scale-[0.99]">
            Open story
          </span>
          <span className="text-sm font-medium text-static-gray">
            {story.source} · {timeAgo(story.publishedAgoMinutes)} · {story.readMinutes} min read
          </span>
        </span>
      </div>
    </button>
  )
}
