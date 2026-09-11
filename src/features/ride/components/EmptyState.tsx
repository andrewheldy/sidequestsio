import type { ReactNode } from 'react'
import { Icon } from './Icon.tsx'
import type { IconName } from './Icon.tsx'

interface EmptyStateProps {
  icon: IconName
  title: string
  detail: string
  action?: ReactNode
}

/** Intentional-looking empty state — never a broken-feeling blank panel. */
export function EmptyState({ icon, title, detail, action }: EmptyStateProps) {
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-border-thin bg-carbon/60 p-8 text-center">
      <span className="text-static-gray">
        <Icon name={icon} size={34} />
      </span>
      <p className="font-display text-xl font-semibold text-signal-white">{title}</p>
      <p className="max-w-sm text-base text-static-gray">{detail}</p>
      {action}
    </div>
  )
}
