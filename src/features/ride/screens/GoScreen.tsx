import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { cta, product } from '../brand'
import { sideQuests } from '../data'
import { resolveToken } from '../lib/handoffClient.ts'
import { Button } from '../components/Button.tsx'
import { FeedLogo } from '../components/FeedLogo.tsx'
import { Icon } from '../components/Icon.tsx'

/**
 * /go/[token] — the simulated mobile continuation. Resolves the opaque token
 * locally (a real deployment resolves it server-side) and renders a fast,
 * phone-shaped page with no account required.
 */
export function GoScreen() {
  const { token = '' } = useParams()
  const resolution = useMemo(() => resolveToken(token), [token])
  const [confirmed, setConfirmed] = useState(false)

  const quest =
    resolution.status === 'ok' && resolution.record.kind === 'sidequest'
      ? sideQuests.find((q) => q.slug === resolution.record.slug)
      : undefined

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto bg-feed-black p-6">
      <div
        className="anim-fade-up w-full max-w-md rounded-3xl border border-border-thin bg-carbon p-7"
        data-testid="go-screen"
      >
        <div className="flex items-center justify-between pb-5">
          <FeedLogo size={16} />
          <span className="text-[11px] font-semibold tracking-[0.18em] text-static-gray uppercase">
            Continued from your ride
          </span>
        </div>

        {resolution.status === 'ok' ? (
          <div className="flex flex-col gap-4" data-testid="go-ok">
            <p className="text-[12px] font-semibold tracking-[0.18em] text-pulse-lime uppercase">
              {resolution.record.kind === 'sidequest'
                ? 'SideQuest'
                : resolution.record.kind === 'offer'
                  ? 'Offer'
                  : resolution.record.kind === 'story'
                    ? 'Story'
                    : 'From the ride'}
            </p>
            <h1 className="font-display text-3xl leading-tight font-bold text-signal-white">
              {resolution.record.title}
            </h1>
            {resolution.record.sponsorLabel ? (
              <p className="text-[12px] text-static-gray">{resolution.record.sponsorLabel}</p>
            ) : null}
            <p className="text-base leading-relaxed text-static-gray">{resolution.record.detail}</p>

            {quest ? (
              <div className="flex gap-2.5">
                {[
                  [`${quest.durationMin} min`, 'clock'],
                  [`${quest.stops} stops`, 'pin'],
                  [quest.energy, 'lightning'],
                ].map(([label, icon]) => (
                  <span
                    key={label}
                    className="flex items-center gap-1.5 rounded-lg border border-border-thin px-3 py-1.5 text-[13.5px] font-semibold text-signal-white"
                  >
                    <span className="text-pulse-lime">
                      <Icon name={icon as 'clock'} size={15} />
                    </span>
                    {label}
                  </span>
                ))}
              </div>
            ) : null}

            {confirmed ? (
              <p
                className="flex items-center gap-2.5 rounded-xl border border-pulse-lime/40 bg-lime-soft px-4 py-3 text-[15px] font-semibold text-pulse-lime"
                data-testid="go-confirmed"
              >
                <Icon name="check" size={20} />
                {quest ? 'Saved for tonight — enjoy the route.' : 'Saved. It will be here after the ride.'}
              </p>
            ) : (
              <Button variant="primary" size="lg" onClick={() => setConfirmed(true)} data-testid="go-primary">
                {quest ? cta.startSideQuest : cta.saveForLater}
              </Button>
            )}
            <p className="text-xs text-static-gray/70">
              No account needed. Demo continuation — saved items live on this device only.
            </p>
          </div>
        ) : resolution.status === 'expired' ? (
          <div className="flex flex-col gap-4" data-testid="go-expired">
            <span className="text-warning">
              <Icon name="clock" size={36} />
            </span>
            <h1 className="font-display text-2xl font-bold text-signal-white">That link took a nap</h1>
            <p className="text-base text-static-gray">
              Handoff codes last 30 minutes. Grab a fresh one from the tablet and try again.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4" data-testid="go-invalid">
            <span className="text-error">
              <Icon name="question" size={36} />
            </span>
            <h1 className="font-display text-2xl font-bold text-signal-white">
              We could not find that code
            </h1>
            <p className="text-base text-static-gray">
              Check the link from the {product.name} tablet, or start fresh below.
            </p>
          </div>
        )}

        <div className="pt-5">
          <Link
            to="/ride"
            className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-static-gray transition-colors hover:text-signal-white"
          >
            <Icon name="chevronLeft" size={18} />
            Back to the ride
          </Link>
        </div>
      </div>
    </div>
  )
}
