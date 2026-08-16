import { ArrowLeft, Bookmark, BarChart3, Clock, Share2 } from 'lucide-react';
import type { Difficulty } from '@/types/db';
import { cn } from '@/lib/utils';
import { BusinessAvatar } from './BusinessAvatar';
import { categoryMeta } from './questCategory';

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

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
  const categoryInfo = categoryMeta(category);
  const CategoryIcon = categoryInfo.icon;

  return (
    <header className="relative min-h-[480px] h-[58svh] max-h-[660px] w-full overflow-hidden bg-[hsl(var(--midnight-900))] text-white">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-[hsl(var(--midnight-800))]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--midnight-950)/0.98)] via-[hsl(var(--midnight-950)/0.14)] to-black/35" />

      <div className="absolute inset-x-0 top-0 mx-auto flex w-full max-w-2xl items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <HeroButton label="Back" onClick={onBack}><ArrowLeft className="h-5 w-5" /></HeroButton>
        <div className="flex items-center gap-2">
          <HeroButton label="Share" onClick={onShare}><Share2 className="h-5 w-5" /></HeroButton>
          <HeroButton label={isSaved ? 'Remove from saved quests' : 'Save quest'} onClick={onToggleSave} active={isSaved}>
            <Bookmark className={cn('h-5 w-5', isSaved && 'fill-current')} />
          </HeroButton>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-2xl px-5 pb-7">
        <div className="mb-5 flex flex-wrap gap-2">
          <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-white/12 px-3 text-xs font-bold backdrop-blur-md">
            <CategoryIcon className="h-3.5 w-3.5" /> {categoryInfo.label}
          </span>
          {difficulty && (
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-white/12 px-3 text-xs font-bold backdrop-blur-md">
              <BarChart3 className="h-3.5 w-3.5 text-[hsl(var(--gold-500))]" /> {DIFFICULTY_LABEL[difficulty]}
            </span>
          )}
          {estimatedTime && (
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-white/12 px-3 text-xs font-bold backdrop-blur-md">
              <Clock className="h-3.5 w-3.5" /> {estimatedTime}
            </span>
          )}
        </div>

        <h1 className="font-display text-[clamp(2.5rem,9vw,4.5rem)] font-bold leading-[0.96] tracking-[-0.055em]">{title}</h1>
        {businessName && (
          <div className="mt-5 flex items-center gap-3">
            <BusinessAvatar name={businessName} src={logoUrl} className="h-11 w-11 text-xs ring-2 ring-white/24" />
            <div><p className="sq-overline text-white/45">Quest host</p><p className="mt-1 text-sm font-semibold text-white/82">{businessName}</p></div>
          </div>
        )}
      </div>
    </header>
  );
}

function HeroButton({ children, label, onClick, active }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={label.includes('Save') || label.includes('Remove') ? active : undefined}
      className={cn('flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-black/40 text-white backdrop-blur-md', active && 'text-[hsl(var(--gold-500))]')}
    >
      {children}
    </button>
  );
}

export default QuestHero;
