import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cta, demoDisclosure, modules } from '../brand'
import { entertainmentItems, nearbyEvents, sponsorForSlot } from '../data'
import type { EntertainmentCategory, EntertainmentItem } from '../data/types.ts'
import { track } from '../lib/analytics.ts'
import { sendToPhone } from '../lib/handoffClient.ts'
import type { HandoffRecord } from '../lib/handoff.ts'
import { useEnsureSession } from '../lib/useEnsureSession.ts'
import { useImpression } from '../lib/useImpression.ts'
import { Button } from '../components/Button.tsx'
import { CardArt } from '../components/CardArt.tsx'
import { ChipRow } from '../components/Chip.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { Icon } from '../components/Icon.tsx'
import { Modal } from '../components/Modal.tsx'
import { ModuleHeader } from '../components/TopNav.tsx'
import { QrModal } from '../components/QrModal.tsx'
import { ScreenScaffold } from '../components/ScreenScaffold.tsx'
import { SponsoredCard } from '../components/SponsoredCard.tsx'

type FilterValue = 'for-you' | EntertainmentCategory

const FILTERS: ReadonlyArray<{ value: FilterValue; label: string }> = [
  { value: 'for-you', label: 'For you' },
  { value: 'events', label: 'Events' },
  { value: 'movies-tv', label: 'Movies & TV' },
  { value: 'culture', label: 'Culture' },
  { value: 'food', label: 'Food' },
  { value: 'nightlife', label: 'Nightlife' },
]

function TrendingTile({ item, onOpen }: { item: EntertainmentItem; onOpen: () => void }) {
  const ref = useImpression<HTMLButtonElement>(item.id, { surface: 'trending' })
  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      data-testid={`ent-tile-${item.slug}`}
      className="group flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border-thin bg-carbon text-left transition-colors hover:border-pulse-lime/50 focus-visible:border-pulse-lime"
    >
      <span className="block h-24 w-full overflow-hidden">
        <CardArt art={item.art} />
      </span>
      <span className="flex flex-1 flex-col gap-1 p-3">
        <span className="line-clamp-2 text-[15.5px] leading-snug font-semibold text-signal-white">
          {item.title}
        </span>
        <span className="mt-auto text-[13px] text-static-gray">
          {item.tag ?? item.neighborhood}
        </span>
      </span>
    </button>
  )
}

/** ENTERTAINMENT — featured event, nearby list, trending shelf, labeled sponsor. */
export function EntertainmentScreen() {
  useEnsureSession('entertainment')
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FilterValue>('for-you')
  const [openItem, setOpenItem] = useState<EntertainmentItem | null>(null)
  const [trailerFor, setTrailerFor] = useState<EntertainmentItem | null>(null)
  const [handoff, setHandoff] = useState<HandoffRecord | null>(null)
  const sponsor = sponsorForSlot('entertainment')

  const items = useMemo(
    () =>
      filter === 'for-you'
        ? entertainmentItems
        : entertainmentItems.filter((e) => e.category === filter),
    [filter],
  )
  const featured = items[0]
  const rest = items.slice(1)

  const sendItem = (item: EntertainmentItem) =>
    setHandoff(
      sendToPhone({
        kind: 'entertainment',
        slug: item.slug,
        title: item.title,
        detail: [item.venue, item.neighborhood, item.when].filter(Boolean).join(' · '),
      }),
    )

  const openDetail = (item: EntertainmentItem) => {
    track('content_opened', { contentId: item.id, module: 'entertainment' })
    setOpenItem(item)
  }

  return (
    <ScreenScaffold
      header={
        <ModuleHeader
          icon="sparkle"
          title={modules.entertainment.name}
          subtitle={modules.entertainment.description}
          onBack={() => navigate('/ride')}
        >
          <ChipRow
            options={FILTERS}
            value={filter}
            onChange={setFilter}
            ariaLabel="Entertainment categories"
          />
        </ModuleHeader>
      }
    >
      <div className="flex flex-col gap-3" data-testid="entertainment-screen">
        {featured ? (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.6fr_1fr]">
            {/* Featured */}
            <article className="relative flex min-h-[320px] flex-col justify-end overflow-hidden rounded-2xl border border-border-thin">
              <div className="absolute inset-0">
                <CardArt art={featured.art} scrim />
              </div>
              <div className="relative flex flex-col gap-2.5 p-6">
                <p className="text-[13px] font-semibold tracking-[0.18em] text-pulse-lime uppercase">
                  Featured {featured.category === 'events' ? 'event' : 'pick'} ·{' '}
                  {featured.neighborhood}
                </p>
                <h2 className="max-w-2xl font-display text-4xl leading-[1.02] font-bold tracking-tight text-signal-white">
                  {featured.title}
                </h2>
                <p className="max-w-xl text-base leading-snug text-static-gray">{featured.blurb}</p>
                <p className="text-sm font-medium text-static-gray">
                  {[featured.when, featured.venue].filter(Boolean).join(' · ')}
                </p>
                <div className="mt-1 flex flex-wrap gap-2.5">
                  <Button variant="primary" onClick={() => openDetail(featured)} data-testid="ent-details">
                    {cta.viewDetails}
                  </Button>
                  {featured.hasTrailer ? (
                    <Button variant="secondary" icon="play" onClick={() => setTrailerFor(featured)}>
                      Watch trailer
                    </Button>
                  ) : null}
                  <Button variant="secondary" icon="phone" onClick={() => sendItem(featured)}>
                    {cta.sendToPhone}
                  </Button>
                </div>
              </div>
            </article>

            {/* Nearby + sponsor */}
            <div className="flex flex-col gap-3">
              <section
                aria-label="Nearby events"
                className="flex-1 rounded-2xl border border-border-thin bg-carbon p-4"
              >
                <h3 className="flex items-center gap-2 px-1 pb-2.5 text-[13px] font-bold tracking-[0.18em] text-static-gray uppercase">
                  <span className="text-pulse-lime">
                    <Icon name="pin" size={15} />
                  </span>
                  Happening nearby
                </h3>
                <ul className="flex flex-col divide-y divide-(--feed-border)">
                  {nearbyEvents.map((event) => (
                    <li key={event.id} className="flex items-center justify-between gap-3 py-3">
                      <span className="min-w-0">
                        <span className="block truncate text-base font-semibold text-signal-white">
                          {event.title}
                        </span>
                        <span className="block text-[13.5px] text-static-gray">{event.venue}</span>
                      </span>
                      <span className="shrink-0 text-[13.5px] font-semibold text-pulse-lime">
                        {event.when}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
              <SponsoredCard placement={sponsor} variant="panel" onSendToPhone={() =>
                setHandoff(
                  sendToPhone({
                    kind: 'offer',
                    slug: sponsor.id,
                    title: `${sponsor.advertiser} — ${sponsor.offer}`,
                    detail: sponsor.headline,
                    sponsorLabel: 'Sponsored · Demo sponsored placement',
                  }),
                )
              } />
            </div>
          </div>
        ) : (
          <EmptyState
            icon="sparkle"
            title="Nothing in this lane right now"
            detail="Try another category — the city always has something going."
          />
        )}

        {/* Trending shelf */}
        {rest.length > 0 ? (
          <section aria-label="Trending now">
            <h3 className="px-1 pb-2 text-[13px] font-bold tracking-[0.18em] text-static-gray uppercase">
              Trending <span className="text-signal-white">now</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {rest.slice(0, 4).map((item) => (
                <TrendingTile key={item.id} item={item} onOpen={() => openDetail(item)} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {/* Detail modal */}
      {openItem ? (
        <Modal open onClose={() => setOpenItem(null)} labelledBy="ent-title" testId="ent-detail">
          <div className="relative h-40">
            <CardArt art={openItem.art} scrim />
            <p className="absolute bottom-3 left-6 text-[13px] font-semibold tracking-[0.18em] text-pulse-lime uppercase">
              {openItem.neighborhood}
            </p>
          </div>
          <div className="flex flex-col gap-4 p-6 pt-4">
            <h2 id="ent-title" className="font-display text-3xl leading-tight font-bold text-signal-white">
              {openItem.title}
            </h2>
            {openItem.when || openItem.venue ? (
              <p className="text-[15px] font-medium text-static-gray">
                {[openItem.when, openItem.venue].filter(Boolean).join(' · ')}
              </p>
            ) : null}
            <p className="max-w-2xl text-lg leading-relaxed text-signal-white/90">{openItem.blurb}</p>
            <div className="flex flex-wrap items-center gap-3 border-t border-border-thin pt-4">
              <Button variant="primary" icon="phone" onClick={() => sendItem(openItem)}>
                {cta.sendToPhone}
              </Button>
              {openItem.hasTrailer ? (
                <Button variant="secondary" icon="play" onClick={() => setTrailerFor(openItem)}>
                  Watch trailer
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-static-gray/70">{demoDisclosure.contentNote}</p>
          </div>
        </Modal>
      ) : null}

      {/* Trailer placeholder */}
      {trailerFor ? (
        <Modal open onClose={() => setTrailerFor(null)} labelledBy="trailer-title" widthClass="max-w-2xl">
          <div className="flex flex-col gap-4 p-6">
            <h2 id="trailer-title" className="font-display text-2xl font-bold text-signal-white">
              {trailerFor.title} — trailer
            </h2>
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border-thin">
              <div className="absolute inset-0">
                <CardArt art={trailerFor.art} scrim />
              </div>
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-pulse-lime text-feed-black">
                <Icon name="play" size={28} />
              </span>
            </div>
            <p className="text-sm text-static-gray">
              Trailer playback is not licensed for this demo — this is a placeholder preview frame.
            </p>
          </div>
        </Modal>
      ) : null}

      <QrModal record={handoff} onClose={() => setHandoff(null)} />
    </ScreenScaffold>
  )
}
