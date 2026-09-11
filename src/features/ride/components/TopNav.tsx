import type { ReactNode } from 'react'
import { product } from '../brand'
import { useClock } from '../lib/useClock.ts'
import { FeedLogo } from './FeedLogo.tsx'
import { HeaderControls } from './HeaderControls.tsx'
import { Icon } from './Icon.tsx'
import type { IconName } from './Icon.tsx'

/** Home header: logo, location, clock, and the shared control cluster. */
export function TopNav() {
  const clock = useClock()
  return (
    <header className="flex items-center justify-between gap-4 px-2 py-1">
      <div className="flex items-center gap-5">
        <FeedLogo size={21} />
        <span className="hidden items-center gap-1.5 text-[15px] font-medium text-static-gray md:flex">
          <span className="text-pulse-lime">
            <Icon name="pin" size={17} />
          </span>
          {product.city}
        </span>
      </div>
      <div className="font-display text-2xl font-bold tracking-tight text-signal-white" data-testid="clock">
        {clock.time}
      </div>
      <HeaderControls />
    </header>
  )
}

interface ModuleHeaderProps {
  icon: IconName
  title: string
  subtitle?: string
  onBack: () => void
  children?: ReactNode
}

/** Module screens: back control, module identity, optional filters, controls. */
export function ModuleHeader({ icon, title, subtitle, onBack, children }: ModuleHeaderProps) {
  return (
    <header className="flex items-center gap-3 px-2 py-1">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to home"
        data-testid="back-to-home"
        className="inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-xl text-signal-white transition-colors hover:bg-white/5 active:bg-white/10"
      >
        <Icon name="chevronLeft" size={26} />
      </button>
      <span className="flex items-center gap-2.5">
        <span className="text-pulse-lime">
          <Icon name={icon} size={24} />
        </span>
        <span className="font-display text-2xl leading-none font-bold tracking-tight text-signal-white uppercase">
          {title}
        </span>
        {subtitle ? (
          <span className="hidden pl-1 text-[15px] text-static-gray 2xl:inline">{subtitle}</span>
        ) : null}
      </span>
      <div className="min-w-0 flex-1 px-2">{children}</div>
      <HeaderControls captions={false} />
    </header>
  )
}
