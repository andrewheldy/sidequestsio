import { useNavigate } from 'react-router-dom'
import { Icon } from './Icon.tsx'
import type { IconName } from './Icon.tsx'
import type { ModuleKey } from '../brand'

interface DestinationTileProps {
  moduleKey: ModuleKey
  name: string
  description: string
  route: string
  icon: IconName
}

/** Primary module destination — large touch target, lime active treatment. */
export function DestinationTile({ moduleKey, name, description, route, icon }: DestinationTileProps) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      data-testid={`destination-${moduleKey}`}
      onClick={() => navigate(route)}
      className="group flex min-h-[76px] cursor-pointer items-center gap-3.5 rounded-2xl border border-border-thin bg-carbon px-4 py-3 text-left transition-all duration-150 hover:border-pulse-lime/60 hover:bg-lime-soft focus-visible:border-pulse-lime active:scale-[0.99]"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border-thin bg-feed-black text-pulse-lime transition-colors group-hover:border-pulse-lime/50">
        <Icon name={icon} size={24} />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-lg leading-tight font-bold tracking-wide text-signal-white">
          {name}
        </span>
        <span className="line-clamp-2 text-[13.5px] leading-snug text-static-gray">
          {description}
        </span>
      </span>
    </button>
  )
}
