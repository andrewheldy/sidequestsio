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
  accent?: "coral" | "turquoise" | "foreground";
}) {
  const color =
    accent === "coral"
      ? "text-primary"
      : accent === "turquoise"
        ? "text-secondary"
        : "text-foreground";
  return (
    <div className="flex flex-col">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("font-poppins text-2xl font-bold", color)}>{value}</span>
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
      <h2 className="font-poppins text-lg font-bold text-foreground">
        {title}
        {accent && <span className="ml-2 text-sm font-medium text-secondary">{accent}</span>}
      </h2>
      {href && (
        <Link
          to={href}
          className="flex items-center gap-1 text-sm text-secondary hover:underline"
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
    <div className="glass-card flex flex-col items-center gap-2 p-8 text-center">
      <p className="font-poppins font-semibold text-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
