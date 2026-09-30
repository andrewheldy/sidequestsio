import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  sub,
  accent = "foreground",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  /** `reward` is Gold (XP, points, achievements); `ocean` is the interactive blue. */
  accent?: "reward" | "ocean" | "foreground";
}) {
  const color =
    accent === "reward"
      ? "text-gold-strong"
      : accent === "ocean"
        ? "text-ocean-strong"
        : "text-foreground";
  return (
    <div className="flex flex-col">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("font-display text-2xl font-bold tracking-[-0.02em]", color)}>{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function SectionHeader({
  title,
  accent,
  href,
  hrefLabel = "View all",
}: {
  title: string;
  accent?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-lg font-bold tracking-[-0.02em] text-foreground">
        {title}
        {accent && <span className="ml-2 text-sm font-medium text-ocean-strong">{accent}</span>}
      </h2>
      {href && (
        <Link
          to={href}
          className="flex items-center gap-1 text-sm font-semibold text-ocean-strong hover:underline"
        >
          {hrefLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-8 text-center">
      <p className="font-display font-bold tracking-[-0.02em] text-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground" role="status">
      <div className="h-2.5 w-2.5 rounded-full bg-ocean" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
