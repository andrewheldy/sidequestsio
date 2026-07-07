import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ChipTone = "coral" | "amber" | "turquoise" | "neutral";

const toneStyles: Record<ChipTone, string> = {
  coral:
    "bg-gradient-to-r from-primary to-[hsl(280_75%_60%)] text-white border-transparent",
  amber: "bg-black/40 text-amber-400 border-amber-400/30 backdrop-blur",
  turquoise: "bg-black/40 text-secondary border-secondary/30 backdrop-blur",
  neutral: "bg-black/40 text-foreground border-white/15 backdrop-blur",
};

/**
 * Small pill used across the quest hero (category / difficulty / estimated time).
 * `tone="coral"` is the filled brand gradient; the others are translucent glass
 * pills that read cleanly over a photo.
 */
export function Chip({
  icon,
  children,
  tone = "neutral",
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  tone?: ChipTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide",
        toneStyles[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export default Chip;
