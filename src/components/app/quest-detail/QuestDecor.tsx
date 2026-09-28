/**
 * Quiet brand texture for the quest page: topographic contour lines and the
 * "explore · learn · discover" emblem around the doorway mark. Both are
 * decorative (aria-hidden) and venue-agnostic.
 */
import { useId } from "react";
import { cn } from "@/lib/utils";
import doorwayMark from "../../../../brand/logos/icon-reverse.svg";

export function TopoLines({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 260"
      fill="none"
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
      className={cn("pointer-events-none", className)}
    >
      <g stroke="currentColor" strokeWidth="1">
        <path d="M-20 214c52-38 96-20 140-44s58-72 114-78 92 38 186 8" />
        <path d="M-20 236c60-40 110-18 158-46s64-78 118-82 90 44 166 16" opacity=".8" />
        <path d="M-20 190c48-34 86-18 124-40s52-64 108-72 94 30 208 0" opacity=".7" />
        <path d="M-20 166c40-30 78-16 110-34s44-54 100-64 96 22 230-8" opacity=".55" />
        <path d="M-20 258c68-42 124-16 176-50s70-86 122-88 86 50 144 24" opacity=".5" />
        <path d="M60 60c20-26 58-30 80-10s12 52-18 58-78-20-62-48Z" opacity=".45" />
        <path d="M44 62c22-40 80-46 110-16s16 76-28 86-106-30-82-70Z" opacity=".3" />
      </g>
    </svg>
  );
}

/** Circular "explore · learn · discover" lettering around the doorway mark. */
export function DiscoveryEmblem({ className }: { className?: string }) {
  const pathId = `emblem-${useId().replace(/:/g, "")}`;
  return (
    <div aria-hidden className={cn("relative h-24 w-24 shrink-0", className)}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-sand-50/55">
        <defs>
          <path id={pathId} d="M50 50m-38 0a38 38 0 1 1 76 0a38 38 0 1 1-76 0" />
        </defs>
        <text fontSize="8.2" letterSpacing="2.4" fill="currentColor" fontWeight="600">
          <textPath href={`#${pathId}`} startOffset="2%">
            EXPLORE · LEARN · DISCOVER ·
          </textPath>
        </text>
      </svg>
      <img
        src={doorwayMark}
        alt=""
        className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 opacity-80"
      />
    </div>
  );
}
