import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { communityLabels, cta, modules, sponsorshipLabels } from '../brand'
import { communityAnnouncements, newsStories, sponsorForSlot } from '../data'
import type { NewsCategory, NewsStory } from '../data/types.ts'
import { track } from '../lib/analytics.ts'
import { timeAgo } from '../lib/format.ts'
import { sendToPhone } from '../lib/handoffClient.ts'
import type { HandoffRecord } from '../lib/handoff.ts'
import { useEnsureSession } from '../lib/useEnsureSession.ts'
import { Button } from '../components/Button.tsx'
import { CardArt } from '../components/CardArt.tsx'
import { ChipRow } from '../components/Chip.tsx'
import { ModuleHeader } from '../components/TopNav.tsx'
import { QrModal } from '../components/QrModal.tsx'
import { ScreenScaffold } from '../components/ScreenScaffold.tsx'
import { Skeleton, StoryCardSkeleton } from '../components/Skeleton.tsx'
import { StoryCard } from '../components/StoryCard.tsx'
import { StoryDetailModal } from '../components/StoryDetailModal.tsx'

type FilterValue = 'for-you' | NewsCategory

const FILTERS: ReadonlyArray<{ value: FilterValue; label: string }> = [
  { value: 'for-you', label: 'For you' },
  { value: 'local', label: 'Local' },
  { value: 'world', label: 'World' },
  { value: 'business', label: 'Business' },
  { value: 'sports', label: 'Sports' },
  { value: 'culture', label: 'Culture' },
]

/** NEWS — short, sourced sample summaries with a featured story and shelves. */
export function NewsScreen() {
  useEnsureSession('news')
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FilterValue>('for-you')
  const [loadedFilter, setLoadedFilter] = useState<FilterValue | null>(null)
  const [openStory, setOpenStory] = useState<NewsStory | null>(null)
  const [handoff, setHandoff] = useState<HandoffRecord | null>(null)
  const newsSponsor = sponsorForSlot('news')

  // Brief simulated fetch so loading skeletons are a designed state, not a hack.
  const loading = loadedFilter !== filter
  useEffect(() => {
    const id = setTimeout(() => setLoadedFilter(filter), 350)
    return () => clearTimeout(id)
  }, [filter])

  const stories = useMemo(
    () => (filter === 'for-you' ? newsStories : newsStories.filter((s) => s.category === filter)),
    [filter],
  )
  const featured = stories[0]
  const supporting = stories.slice(1, 4)
  const shelf = stories.slice(4)

  const sendStory = (story: NewsStory) =>
    setHandoff(
      sendToPhone({
        kind: 'story',
        slug: story.slug,
        title: story.headline,
        detail: story.summary,
      }),
    )

  // Community CTAs hand off to the phone like every other actionable surface —
  // the tablet never becomes the place you have to write something down.
  const sendCommunity = (item: (typeof communityAnnouncements)[number]) => {
    track('community_opened', { contentId: item.id })
    setHandoff(
      sendToPhone({
        kind: 'offer',
        slug: item.id,
        title: `${item.title} · ${item.org}`,
        detail: `${item.when} — ${item.blurb}`,
        sponsorLabel: `${sponsorshipLabels.communitySponsor}: ${newsSponsor.advertiser} · ${sponsorshipLabels.demoPlacement}`,
      }),
    )
  }

  return (
    <ScreenScaffold
      header={
        <ModuleHeader
          icon="globe"
          title={modules.news.name}
          subtitle={modules.news.description}
          onBack={() => navigate('/ride')}
        >
          <ChipRow options={FILTERS} value={filter} onChange={setFilter} ariaLabel="News categories" />
        </ModuleHeader>
      }
    >
      <div className="flex flex-col gap-3" data-testid="news-screen">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.5fr_1fr]">
            <Skeleton className="h-[340px] w-full rounded-2xl" />
            <div className="flex flex-col gap-3">
              <StoryCardSkeleton />
              <StoryCardSkeleton />
              <StoryCardSkeleton />
            </div>
          </div>
        ) : featured ? (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.5fr_1fr]">
            {/* Featured story */}
            <article className="relative flex min-h-[340px] flex-col justify-end overflow-hidden rounded-2xl border border-border-thin">
              <div className="absolute inset-0">
                <CardArt art={featured.art} scrim />
              </div>
              <div className="relative flex flex-col gap-2.5 p-6">
                <p className="text-[13px] font-semibold tracking-[0.18em] text-pulse-lime uppercase">
                  {featured.kicker}
                </p>
                <h2 className="max-w-2xl font-display text-4xl leading-[1.02] font-bold tracking-tight text-signal-white">
                  {featured.headline}
                </h2>
                <p className="max-w-xl text-base leading-snug text-static-gray">
                  {featured.summary}
                </p>
                <p className="text-sm font-medium text-static-gray">
                  {featured.source} · {timeAgo(featured.publishedAgoMinutes)} ·{' '}
                  {featured.readMinutes} min read
                </p>
                <div className="mt-1 flex flex-wrap gap-2.5">
                  <Button variant="primary" onClick={() => setOpenStory(featured)} data-testid="open-featured">
                    {cta.readNow}
                  </Button>
                  <Button variant="secondary" icon="headphones" onClick={() => setOpenStory(featured)}>
                    Listen to summary
                  </Button>
                  <Button variant="secondary" icon="phone" onClick={() => sendStory(featured)}>
                    {cta.sendToPhone}
                  </Button>
                </div>
              </div>
            </article>

            {/* Supporting stories */}
            <div className="flex flex-col gap-3">
              {supporting.map((story) => (
                <StoryCard key={story.id} story={story} onOpen={() => setOpenStory(story)} />
              ))}
              {supporting.length === 0 ? (
                <p className="rounded-xl border border-border-thin bg-carbon p-5 text-base text-static-gray">
                  That is the whole story for this filter right now.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* More top stories */}
        {!loading && shelf.length > 0 ? (
          <section aria-label="More top stories">
            <h3 className="px-1 pb-2 text-[13px] font-bold tracking-[0.18em] text-static-gray uppercase">
              More <span className="text-signal-white">top stories</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {shelf.map((story) => (
                <StoryCard key={story.id} story={story} variant="tile" onOpen={() => setOpenStory(story)} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Around Miami — community announcements */}
        <section
          aria-label={communityLabels.aroundMiami}
          className="rounded-2xl border border-border-thin bg-carbon p-4"
          data-testid="community-section"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-1 pb-3">
            <h3 className="text-[13px] font-bold tracking-[0.18em] text-static-gray uppercase">
              <span className="text-pulse-lime">{communityLabels.aroundMiami}</span> · Community
            </h3>
            <p className="text-[11px] text-static-gray/80">
              {sponsorshipLabels.communitySponsor}: {newsSponsor.advertiser} ·{' '}
              {sponsorshipLabels.demoPlacement}
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {communityAnnouncements.slice(0, 3).map((item) => (
              <li key={item.id} className="flex flex-col gap-1 rounded-xl border border-border-thin bg-feed-black/50 p-4">
                <p className="text-[12px] font-semibold tracking-wide text-pulse-lime uppercase">
                  {item.when}
                </p>
                <p className="text-base leading-snug font-semibold text-signal-white">{item.title}</p>
                <p className="text-[14px] leading-snug text-static-gray">{item.blurb}</p>
                <button
                  type="button"
                  onClick={() => sendCommunity(item)}
                  data-testid={`community-cta-${item.id}`}
                  className="mt-1 inline-flex min-h-11 cursor-pointer items-center self-start rounded-lg text-[14px] font-semibold text-pulse-lime transition-colors hover:text-signal-white"
                >
                  {item.cta} · {item.org}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <StoryDetailModal story={openStory} onClose={() => setOpenStory(null)} onSendToPhone={sendStory} />
      <QrModal record={handoff} onClose={() => setHandoff(null)} />
    </ScreenScaffold>
  )
}
