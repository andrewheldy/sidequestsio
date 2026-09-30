import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bookmark, Clock, MapPin, Share2, Sparkle } from "lucide-react";
import { cn } from "@/lib/utils";
import { responsiveImage } from "@/lib/images";
import { CategoryIcon } from "@/components/brand/CategoryIcon";
import type { QuestHeroModel } from "@/lib/quests/questPage";
import { TopoLines } from "./QuestDecor";

/**
 * Location hero: the venue photo bleeds into Midnight Navy, with the category
 * pill, the venue name in two weights and location/duration metadata laid
 * over its lower edge. Entirely data-driven — a quest without a photo gets a
 * branded navy fallback anchored by its category glyph.
 *
 * The photo is the page's LCP candidate, so it loads eagerly at high priority.
 */
export function QuestHero({
  hero,
  category,
  categoryLabel,
  isSaved,
  onBack,
  onShare,
  onToggleSave,
  onVisible,
}: {
  hero: QuestHeroModel;
  category: string;
  categoryLabel: string;
  isSaved: boolean;
  onBack: () => void;
  onShare: () => void;
  onToggleSave: () => void;
  /** Fires when the hero has painted: its photo loaded, or the fallback is showing. */
  onVisible: (image: "loaded" | "fallback") => void;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">(
    hero.imageUrl ? "loading" : "failed",
  );
  const image = hero.imageUrl ? responsiveImage(hero.imageUrl, [640, 960, 1280]) : null;
  const showFallback = !image || status === "failed";

  return (
    <header className="relative">
      <div className="relative h-[clamp(300px,50svh,440px)] overflow-hidden bg-midnight-900">
        {showFallback ? (
          <HeroFallback category={category} onMount={() => onVisible("fallback")} />
        ) : (
          <img
            src={image.src}
            srcSet={image.srcSet}
            sizes="(min-width: 640px) 600px, 100vw"
            alt=""
            decoding="async"
            // React 18 has no typed fetchPriority prop; the lowercase attribute passes through.
            {...({ fetchpriority: "high" } as Record<string, string>)}
            onLoad={() => {
              setStatus("loaded");
              onVisible("loaded");
            }}
            onError={() => setStatus("failed")}
            className={cn(
              "h-full w-full object-cover transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
              status === "loaded" ? "scale-100 opacity-100" : "scale-[1.04] opacity-0 motion-reduce:scale-100",
            )}
          />
        )}
        {/* Readability: dark top edge for controls, deep navy fade under the title. */}
        <div className="absolute inset-0 bg-gradient-to-b from-midnight-950/55 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-midnight-950 via-midnight-950/75 to-transparent" />
      </div>

      {/* Top controls */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <GlassButton label="Go back" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </GlassButton>
        <div className="flex min-w-0 items-center gap-2">
          <GlassButton label="Share this quest" onClick={onShare}>
            <Share2 className="h-[18px] w-[18px]" />
          </GlassButton>
          <GlassButton
            label={isSaved ? "Remove from saved quests" : "Save quest"}
            onClick={onToggleSave}
            pressed={isSaved}
          >
            <Bookmark className={cn("h-[18px] w-[18px]", isSaved && "fill-current text-gold")} />
          </GlassButton>
          {hero.city && (
            <span className="inline-flex h-11 min-w-0 items-center gap-1.5 rounded-full border border-white/10 bg-midnight-950/70 px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-sand-50 backdrop-blur-md">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{hero.city}</span>
            </span>
          )}
        </div>
      </div>

      {/* Title block overlaps the photo's faded lower edge */}
      <div className="relative -mt-32 px-5">
        <span className="inline-flex items-center gap-2 rounded-full border border-gold/70 bg-midnight-950/60 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-gold backdrop-blur-sm">
          <Sparkle className="h-3.5 w-3.5 fill-current" aria-hidden />
          {categoryLabel}
        </span>
        <h1 className="mt-3 break-words font-display text-sand-50">
          <span className="block text-[clamp(2.4rem,11vw,3.4rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
            {hero.titleLead}
          </span>
          {hero.titleTail && (
            <span className="mt-1 block text-[clamp(1.6rem,7vw,2.1rem)] font-medium leading-tight tracking-[-0.03em] text-sand-50/90">
              {hero.titleTail}
            </span>
          )}
        </h1>

        {(hero.locationLabel || hero.duration) && (
          <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] text-sand-50/85">
            {hero.locationLabel && (
              <li className="flex items-center gap-2">
                <MapPin className="h-[18px] w-[18px] text-sand-50" aria-hidden />
                <span className="sr-only">Location: </span>
                {hero.locationLabel}
              </li>
            )}
            {hero.locationLabel && hero.duration && (
              <li aria-hidden className="h-5 w-px bg-sand-50/20" />
            )}
            {hero.duration && (
              <li className="flex items-center gap-2">
                <Clock className="h-[18px] w-[18px] text-sand-50" aria-hidden />
                <span className="sr-only">Estimated time: </span>
                {hero.duration}
              </li>
            )}
          </ul>
        )}
      </div>
    </header>
  );
}

function HeroFallback({ category, onMount }: { category: string; onMount: () => void }) {
  // The fallback is the painted hero for this quest; report it once on mount.
  const report = useRef(onMount);
  useEffect(() => report.current(), []);
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-[radial-gradient(120%_90%_at_70%_20%,hsl(var(--ocean-500)/0.28),transparent_60%),linear-gradient(160deg,hsl(var(--midnight-800)),hsl(var(--midnight-950)))]">
      <TopoLines className="absolute inset-0 h-full w-full text-sand-50/[0.07]" />
      <CategoryIcon category={category} strokeWidth={1.2} className="relative h-24 w-24 -translate-y-8 text-gold/40" />
    </div>
  );
}

function GlassButton({
  children,
  label,
  onClick,
  pressed,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-midnight-950/70 text-sand-50 backdrop-blur-md transition-transform duration-150 hover:bg-midnight-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold active:scale-95"
    >
      {children}
    </button>
  );
}

export default QuestHero;
