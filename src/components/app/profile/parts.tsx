import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/** XP needed to reach the next level (mirrors the onboarding/leveling curve). */
export function nextLevelXp(level: number): number {
  return Math.max(1, level) * 250;
}

/** "Joined June 2026" — or null if we don't have a date. */
export function formatJoined(createdAt: string | null | undefined): string | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return `Joined ${d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;
}

export function StatTile({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="glass-card flex flex-col items-center gap-1 p-4 text-center">
      {icon}
      <span className="font-poppins text-lg font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function XpMeter({ xp, level }: { xp: number; level: number }) {
  const target = nextLevelXp(level);
  const pct = Math.min(100, Math.round((xp / target) * 100));
  return (
    <div className="glass-card p-5">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">Progress to Level {level + 1}</span>
        <span className="text-muted-foreground">
          {xp} / {target} XP
        </span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-muted/50"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Level progress"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-coral to-turquoise transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * A titled activity card. When there's no data yet it shows a friendly,
 * on-brand empty state instead of mock content.
 */
export function ActivitySection({
  icon,
  title,
  count,
  emptyText,
  children,
}: {
  icon: ReactNode;
  title: string;
  count?: number;
  emptyText: string;
  children?: ReactNode;
}) {
  const isEmpty = !children || count === 0;
  return (
    <section className="glass-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="font-poppins font-semibold">{title}</h2>
        {typeof count === 'number' && count > 0 && (
          <span className="ml-auto rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      {isEmpty ? <p className="text-sm text-muted-foreground">{emptyText}</p> : children}
    </section>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-5 pb-8" aria-busy="true" aria-label="Loading profile">
      {/* Header card */}
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60">
        {/* Gradient banner placeholder */}
        <div className="h-16 bg-muted/30" />
        {/* Content */}
        <div className="flex flex-col items-center px-5 pb-6">
          {/* Avatar overlapping banner */}
          <Skeleton className="-mt-12 mb-3 h-24 w-24 rounded-[22px]" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-1.5 h-4 w-24" />
          <Skeleton className="mt-1 h-4 w-40" />
          <Skeleton className="mt-3 h-4 w-52" />
          <Skeleton className="mt-4 h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>

      {/* XP meter */}
      <Skeleton className="h-20 rounded-2xl" />

      {/* Social links section */}
      <Skeleton className="h-36 rounded-2xl" />

      {/* Activity sections */}
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
    </div>
  );
}
