import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useImpression } from "@/hooks/useImpression";
import { responsiveImage } from "@/lib/images";
import type { VenueCardModel } from "@/lib/quests/questPage";
import doorwayMark from "../../../../brand/logos/icon-reverse.svg";

/**
 * Compact "About <venue>" card: photo, editorial copy, hours/price when known
 * and the venue's real website. Hidden entirely when there is nothing to say.
 */
export function VenueInfoCard({
  venue,
  onViewed,
  onWebsiteClick,
}: {
  venue: VenueCardModel;
  onViewed: () => void;
  onWebsiteClick: () => void;
}) {
  const ref = useImpression<HTMLElement>(onViewed);
  const meta = [venue.hours && [venue.hours, venue.hoursNote].filter(Boolean).join(" · "), venue.priceRange]
    .filter(Boolean)
    .join("  ·  ");
  const hasContent = venue.description || venue.websiteUrl || venue.imageUrl || meta;
  if (!hasContent) return null;

  return (
    <section ref={ref} aria-labelledby="venue-about-title" className="px-3 pt-8">
      <div className="flex gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-3">
        <VenueImage venue={venue} />
        <div className="min-w-0 flex-1 py-1">
          <h2 id="venue-about-title" className="font-display text-base font-bold leading-snug text-sand-50">
            About {venue.shortName}
          </h2>
          {venue.description && (
            <p className="mt-1.5 line-clamp-4 text-[13px] leading-snug text-sand-50/65">{venue.description}</p>
          )}
          {meta && <p className="mt-1.5 text-xs text-sand-50/50">{meta}</p>}
          {venue.websiteUrl && (
            <a
              href={venue.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onWebsiteClick}
              aria-label={`Visit ${venue.name} website (opens in a new tab)`}
              className="mt-3 inline-flex h-9 items-center gap-2 rounded-full border border-sand-50/40 px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-sand-50 transition-colors hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold active:scale-[0.97]"
            >
              Visit website <ArrowUpRight className="h-4 w-4" aria-hidden />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function VenueImage({ venue }: { venue: VenueCardModel }) {
  const [failed, setFailed] = useState(false);
  const box = "h-[104px] w-[104px] shrink-0 overflow-hidden rounded-2xl min-[400px]:w-[128px]";

  if (venue.imageUrl && !failed) {
    const image = responsiveImage(venue.imageUrl, [256, 400]);
    return (
      <div className={`${box} bg-midnight-800`}>
        <img
          src={image.src}
          srcSet={image.srcSet}
          sizes="128px"
          alt={`${venue.name}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  if (venue.logoUrl && !failed) {
    return (
      <div className={`${box} flex items-center justify-center bg-sand-50`}>
        <img src={venue.logoUrl} alt={`${venue.name} logo`} loading="lazy" onError={() => setFailed(true)} className="h-3/4 w-3/4 object-contain" />
      </div>
    );
  }
  return (
    <div className={`${box} flex items-center justify-center bg-gradient-to-br from-midnight-800 to-midnight-950`}>
      <img src={doorwayMark} alt="" className="h-10 w-10 opacity-40" />
    </div>
  );
}

export default VenueInfoCard;
