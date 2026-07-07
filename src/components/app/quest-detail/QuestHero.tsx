import { ArrowLeft, Bookmark, BarChart3, Clock, Share2 } from "lucide-react";
import type { Difficulty } from "@/types/db";
import { cn } from "@/lib/utils";
import { BusinessAvatar } from "./BusinessAvatar";
import { Chip } from "./Chip";
import { categoryMeta } from "./questCategory";

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

/**
 * The quest hero: full-bleed photo, floating back / share / save controls, the
 * circular business avatar, and the category / difficulty / time chips. This is
 * the "cover photo" of the adventure's profile page.
 */
export function QuestHero({
  imageUrl,
  title,
  businessName,
  logoUrl,
  category,
  difficulty,
  estimatedTime,
  isSaved,
  onBack,
  onShare,
  onToggleSave,
}: {
  imageUrl: string | null;
  title: string;
  businessName: string | null;
  logoUrl?: string | null;
  category: string;
  difficulty?: Difficulty | null;
  estimatedTime?: string | null;
  isSaved: boolean;
  onBack: () => void;
  onShare: () => void;
  onToggleSave: () => void;
}) {
  const cat = categoryMeta(category);
  const CatIcon = cat.icon;

  return (
    <div className="relative h-80 w-full overflow-hidden">
      {imageUrl ? (
        <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-primary/30 to-secondary/20" />
      )}

      {/* Bottom fade so chips + avatar read cleanly against the photo */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-black/25" />

      {/* Top controls */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-4">
        <HeroButton label="Back" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </HeroButton>

        <div className="flex items-center gap-2">
          <HeroButton label="Share" onClick={onShare}>
            <Share2 className="h-5 w-5" />
          </HeroButton>
          <HeroButton
            label={isSaved ? "Remove from saved" : "Save"}
            onClick={onToggleSave}
            active={isSaved}
          >
            <Bookmark className={cn("h-5 w-5", isSaved && "fill-current")} />
          </HeroButton>
        </div>
      </div>

      {/* Floating business avatar */}
      <BusinessAvatar
        name={businessName ?? title}
        src={logoUrl}
        className="absolute left-4 top-16 h-28 w-28 text-2xl"
      />

      {/* Bottom chips */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-4 pb-4">
        <Chip tone="coral" icon={<CatIcon className="h-3.5 w-3.5" />}>
          {cat.label}
        </Chip>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {difficulty && (
            <Chip tone="amber" icon={<BarChart3 className="h-3.5 w-3.5" />}>
              {DIFFICULTY_LABEL[difficulty]}
            </Chip>
          )}
          {estimatedTime && (
            <Chip tone="turquoise" icon={<Clock className="h-3.5 w-3.5" />}>
              {estimatedTime}
            </Chip>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroButton({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/60 active:scale-95",
        active && "text-primary",
      )}
    >
      {children}
    </button>
  );
}

export default QuestHero;
