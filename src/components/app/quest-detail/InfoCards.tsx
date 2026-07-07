import { Clock, DollarSign, Map } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Informational cards: Hours, Price Range, Neighborhood.
 *
 * Hours and Price Range have no backing columns in the current schema, so they
 * render a muted "Not listed yet" placeholder when absent — this keeps the
 * profile layout intact and signals exactly which fields the DB-alignment pass
 * should add. Neighborhood is derived from the venue location we already have.
 */
export function InfoCards({
  hours,
  hoursNote,
  priceRange,
  priceNote,
  neighborhood,
  city,
}: {
  hours?: string | null;
  hoursNote?: string | null;
  priceRange?: string | null;
  priceNote?: string | null;
  neighborhood?: string | null;
  city?: string | null;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <InfoCard
        icon={<Clock className="h-4 w-4 text-secondary" />}
        title="Hours"
        primary={hours}
        secondary={hours ? hoursNote : null}
      />
      <InfoCard
        icon={<DollarSign className="h-4 w-4 text-amber-400" />}
        title="Price Range"
        primary={priceRange}
        secondary={priceRange ? priceNote : null}
      />
      <InfoCard
        icon={<Map className="h-4 w-4 text-[hsl(140_60%_55%)]" />}
        title="Neighborhood"
        primary={neighborhood}
        secondary={neighborhood ? city : null}
      />
    </div>
  );
}

function InfoCard({
  icon,
  title,
  primary,
  secondary,
}: {
  icon: ReactNode;
  title: string;
  primary?: string | null;
  secondary?: string | null;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border/60 bg-card/40 p-3.5">
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
      </div>
      {primary ? (
        <>
          <span className="text-sm font-semibold leading-snug text-foreground">
            {primary}
          </span>
          {secondary && (
            <span className="text-xs text-muted-foreground">{secondary}</span>
          )}
        </>
      ) : (
        <span className="text-xs italic text-muted-foreground/60">Not listed yet</span>
      )}
    </div>
  );
}

export default InfoCards;
