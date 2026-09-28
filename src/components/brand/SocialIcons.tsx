/**
 * Recognisable service marks for the quest page's Explore & Share cards.
 *
 * lucide-react (the project's icon library) ships Instagram and Globe, which
 * are used as-is. It has no TikTok, X or Google marks, so those are drawn
 * inline from their public vector paths (Simple Icons, CC0; Google's "G" in its
 * four brand colours) — vectors, not downloaded raster logos.
 */
import { Globe, Instagram, Link2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OptionalActionType } from "@/lib/quests/questPage";

const TIKTOK_PATH =
  "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z";

const X_PATH =
  "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z";

export function InstagramMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center rounded-[28%] bg-[radial-gradient(circle_at_30%_107%,#fdf497_0%,#fdf497_5%,#fd5949_45%,#d6249f_60%,#285AEB_90%)] text-white",
        className,
      )}
    >
      <Instagram className="h-[62%] w-[62%]" strokeWidth={2.2} />
    </span>
  );
}

export function TikTokMark({ className }: { className?: string }) {
  // The mark's signature cyan/red offset, layered under the foreground glyph.
  return (
    <svg viewBox="-1 -1 26 26" aria-hidden className={className}>
      <path d={TIKTOK_PATH} fill="#25F4EE" transform="translate(-0.7 -0.7)" />
      <path d={TIKTOK_PATH} fill="#FE2C55" transform="translate(0.7 0.7)" />
      <path d={TIKTOK_PATH} fill="currentColor" />
    </svg>
  );
}

export function XMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path d={X_PATH} fill="currentColor" />
    </svg>
  );
}

export function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

/** The mark for an Explore & Share action type. */
export function OptionalActionIcon({ type, className }: { type: OptionalActionType; className?: string }) {
  switch (type) {
    case "instagram":
      return <InstagramMark className={className} />;
    case "tiktok":
      return <TikTokMark className={cn("text-sand-50", className)} />;
    case "x":
      return <XMark className={cn("text-sand-50", className)} />;
    case "google_review":
      return <GoogleMark className={className} />;
    case "review":
      return <Star aria-hidden className={cn("text-gold", className)} />;
    case "website":
      return <Globe aria-hidden strokeWidth={1.6} className={cn("text-sand-50", className)} />;
    case "socials":
      return <Link2 aria-hidden strokeWidth={1.8} className={cn("text-sand-50", className)} />;
  }
}
