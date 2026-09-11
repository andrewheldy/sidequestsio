import { cta } from '../brand'
import { useImpression } from '../lib/useImpression.ts'
import type { SponsoredPlacement } from '../data/types.ts'
import { Button } from './Button.tsx'
import { CardArt } from './CardArt.tsx'
import { Icon } from './Icon.tsx'
import { SponsorLabel } from './SponsorLabel.tsx'

interface SponsoredCardProps {
  placement: SponsoredPlacement
  onSendToPhone: () => void
  variant?: 'banner' | 'panel'
}

/**
 * Sponsored placement: always labeled, one clear offer, one primary action,
 * never blocking navigation. Advertisers in the prototype are fictional.
 */
export function SponsoredCard({ placement, onSendToPhone, variant = 'banner' }: SponsoredCardProps) {
  const ref = useImpression<HTMLElement>(placement.id, { surface: 'sponsored', slot: placement.slot })

  if (variant === 'panel') {
    return (
      <section
        ref={ref}
        aria-label={`Sponsored: ${placement.advertiser}`}
        data-testid={`sponsored-${placement.slot}`}
        className="flex flex-col overflow-hidden rounded-2xl border border-border-thin bg-carbon"
      >
        <div className="relative h-28">
          <CardArt art={placement.art} scrim />
          <div className="absolute bottom-2 left-4">
            <SponsorLabel labelKey={placement.labelKey} />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <p className="font-display text-xl leading-tight font-bold text-signal-white">
            {placement.headline}
          </p>
          <p className="text-[15px] text-static-gray">
            {placement.advertiser} · {placement.offer}
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-2.5">
            <Button variant="primary" onClick={onSendToPhone}>
              {placement.cta}
            </Button>
            {placement.cta !== cta.sendToPhone ? (
              <Button variant="ghost" icon="qr" onClick={onSendToPhone} aria-label={cta.sendToPhone}>
                {cta.sendToPhone}
              </Button>
            ) : null}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      ref={ref}
      aria-label={`Sponsored: ${placement.advertiser}`}
      data-testid={`sponsored-${placement.slot}`}
      className="flex items-center gap-4 overflow-hidden rounded-2xl border border-border-thin bg-carbon py-2.5 pr-4 pl-2.5"
    >
      <span className="block h-14 w-20 shrink-0 overflow-hidden rounded-lg">
        <CardArt art={placement.art} />
      </span>
      <div className="min-w-0 flex-1">
        <SponsorLabel labelKey={placement.labelKey} />
        <p className="mt-0.5 truncate text-base font-semibold text-signal-white">
          {placement.advertiser} — {placement.offer}
        </p>
      </div>
      <Button variant="primary" onClick={onSendToPhone} className="shrink-0">
        {placement.cta}
      </Button>
      <button
        type="button"
        aria-label={cta.sendToPhone}
        onClick={onSendToPhone}
        className="hidden min-h-12 min-w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl text-static-gray transition-colors hover:bg-white/5 hover:text-signal-white xl:inline-flex"
      >
        <Icon name="qr" size={26} />
      </button>
    </section>
  )
}
