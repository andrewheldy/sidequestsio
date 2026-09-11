/** Loading skeleton block — calm shimmer via opacity pulse, reduced-motion safe. */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span
      className={`block animate-pulse rounded-lg bg-graphite/60 ${className}`}
      aria-hidden="true"
    />
  )
}

export function StoryCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-xl border border-border-thin bg-carbon p-3">
      <Skeleton className="h-20 w-28 shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}
