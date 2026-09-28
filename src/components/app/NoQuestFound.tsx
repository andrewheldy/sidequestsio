import { Link } from "react-router-dom";
import { ArrowRight, Sparkle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The "no quest found" moment, used for missing quests and as the app-wide
 * 404. A SideQuests doorway swings open onto an empty, glowing path — the
 * adventure isn't here, but another one is. Animation lives in index.css
 * (`.sq-door*`); under prefers-reduced-motion the door simply rests open.
 */
export function NoQuestFound({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="no-quest-title"
      className={cn("flex flex-col items-center px-6 text-center", className)}
    >
      <Doorway />

      <p className="sq-door-copy mt-8 text-[11px] font-bold uppercase tracking-[0.32em] text-gold">
        404 · Off the map
      </p>
      <h1
        id="no-quest-title"
        className="sq-door-copy mt-3 font-display text-[clamp(2.2rem,10vw,3rem)] font-extrabold leading-none tracking-[-0.045em] text-sand-50"
      >
        No quest found
      </h1>
      <p className="sq-door-copy mt-4 max-w-[30ch] text-[15px] leading-relaxed text-sand-50/65">
        This door opens onto… nothing. The quest may have wrapped up, moved on, or never existed.
      </p>

      <div className="sq-door-copy mt-8 flex w-full max-w-xs flex-col gap-3">
        <Link
          to="/app/map"
          className="group relative flex h-14 items-center justify-center rounded-full bg-sand-50 px-12 text-[13px] font-bold uppercase tracking-[0.24em] text-midnight-950 transition-[transform,box-shadow] duration-150 hover:shadow-[0_18px_44px_-16px_hsl(var(--gold-500)/0.55)] active:scale-[0.98]"
        >
          Find a quest
          <ArrowRight
            aria-hidden
            className="absolute right-6 h-5 w-5 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
        <Link
          to="/"
          className="flex h-12 items-center justify-center rounded-full border border-sand-50/25 text-sm font-semibold text-sand-50/85 transition-colors hover:border-gold/60 hover:text-gold"
        >
          Back to home
        </Link>
      </div>
    </section>
  );
}

/** Arched frame, glowing opening, and a door panel that swings inward. */
function Doorway() {
  return (
    <div aria-hidden className="relative mt-4 h-[230px] w-[200px]">
      {/* Light spilling onto the floor */}
      <div className="sq-door-spill absolute -bottom-3 left-1/2 h-10 w-56 -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,hsl(var(--gold-500)/0.45),transparent)]" />

      {/* Opening: what's on the other side — an empty, winding path */}
      <div className="absolute bottom-0 left-1/2 h-[200px] w-[128px] -translate-x-1/2 overflow-hidden rounded-t-full bg-[radial-gradient(120%_85%_at_50%_100%,hsl(var(--gold-500)/0.55),hsl(var(--ocean-500)/0.35)_45%,hsl(var(--midnight-950))_85%)]">
        <svg viewBox="0 0 128 200" className="sq-door-light absolute inset-0 h-full w-full" fill="none">
          <path
            d="M64 200c0-26 30-30 30-52s-40-22-40-44 26-24 26-44"
            stroke="hsl(var(--sand-50) / 0.55)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="4 9"
          />
        </svg>
        <span className="sq-door-light sq-door-float absolute left-1/2 top-[38px] -translate-x-1/2 font-display text-3xl font-extrabold text-sand-50/80">
          ?
        </span>
        <Sparkle className="sq-door-light sq-door-twinkle absolute left-[22px] top-[86px] h-3 w-3 fill-current text-gold" />
        <Sparkle className="sq-door-light sq-door-twinkle absolute right-[20px] top-[120px] h-2.5 w-2.5 fill-current text-sand-50 [animation-delay:1.1s]" />

        {/* The door itself, hinged on the left */}
        <div className="absolute inset-0 [perspective:520px]">
          <div className="sq-door relative h-full w-full origin-left rounded-t-full border border-sand-50/10 bg-gradient-to-b from-midnight-800 to-midnight-900 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-x-4 top-8 h-16 rounded-t-full border border-sand-50/10" />
            <div className="absolute inset-x-4 bottom-6 h-20 rounded-md border border-sand-50/10" />
            <span className="absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_10px_hsl(var(--gold-500)/0.8)]" />
          </div>
        </div>
      </div>

      {/* Arched frame, drawn over everything */}
      <svg viewBox="0 0 200 230" className="absolute inset-0 h-full w-full" fill="none">
        <path
          d="M28 230V100a72 72 0 0 1 144 0v130"
          stroke="hsl(var(--sand-50))"
          strokeWidth="14"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export default NoQuestFound;
