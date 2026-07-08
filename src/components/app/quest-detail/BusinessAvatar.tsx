import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Circular business logo that floats over the quest hero image — the "profile
 * picture" of the real-world adventure. Falls back to the business initials on
 * a light disc when no logo image is available or the logo URL fails to load.
 *
 * `src` comes from `venues.logo_url` (migration 0014); most venues have no
 * logo yet, so the initials fallback is the common case at launch.
 */
export function BusinessAvatar({
  name,
  src,
  className,
}: {
  name: string | null | undefined;
  src?: string | null;
  className?: string;
}) {
  const initials = deriveInitials(name);
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.6)] ring-4 ring-background",
        className,
      )}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={name ?? "Business logo"}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="px-1 text-center font-poppins font-bold uppercase leading-none tracking-tight text-charcoal">
          {initials}
        </span>
      )}
    </div>
  );
}

function deriveInitials(name: string | null | undefined): string {
  if (!name) return "SQ";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "SQ";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export default BusinessAvatar;
