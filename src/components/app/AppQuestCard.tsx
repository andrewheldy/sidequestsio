import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock, Heart, MapPin } from 'lucide-react';
import type { Quest } from '@/lib/quests';
import { cn } from '@/lib/utils';
import QuestImage from '@/components/QuestImage';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useSignInPrompt } from '@/contexts/SignInPromptContext';
import { useToast } from '@/hooks/use-toast';

export function AppQuestCard({ quest, featured = false }: { quest: Quest; featured?: boolean }) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { promptSignIn } = useSignInPrompt();
  const { toast } = useToast();
  const favorited = isFavorite(quest.id);
  const href = `/quests/${quest.id}`;

  const handleFavorite = () => {
    if (!user) {
      promptSignIn('save favorites');
      return;
    }
    toggleFavorite(quest.id);
    toast({
      title: favorited ? 'Removed from saved quests' : 'Saved for later',
      description: quest.title,
    });
  };

  return (
    <article className={cn('quest-card overflow-hidden rounded-2xl border border-border bg-card', featured && 'rounded-3xl')}>
      <div className={cn('relative overflow-hidden bg-muted', featured ? 'aspect-[5/4]' : 'aspect-[4/3]')}>
        <Link to={href} aria-label={`Open quest: ${quest.title}`} className="block h-full focus-visible:outline-none">
          <QuestImage src={quest.image} alt="" category={quest.category} className="quest-card__image" />
        </Link>
        <span className="sq-overline absolute left-3 top-3 rounded-lg bg-[hsl(var(--midnight-900))] px-2.5 py-2 text-white">
          {quest.category}
        </span>
        <button
          type="button"
          onClick={handleFavorite}
          aria-label={favorited ? 'Remove from saved quests' : 'Save quest'}
          aria-pressed={favorited}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-[hsl(var(--midnight-900)/0.76)] text-white backdrop-blur-md"
        >
          <Heart className={cn('h-5 w-5', favorited && 'fill-[hsl(var(--coral-500))] text-[hsl(var(--coral-500))]')} />
        </button>
      </div>

      <div className={cn('p-4', featured && 'p-5')}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link to={href} className="font-display text-lg font-bold leading-tight tracking-[-0.03em] hover:underline hover:underline-offset-4">
              {quest.title}
            </Link>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-[hsl(var(--ocean-500))]" />
              <span className="truncate">{quest.venueName ? `${quest.venueName} · ` : ''}{quest.neighborhood}</span>
            </p>
          </div>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        </div>

        {featured && (quest.funky_action || quest.description) && (
          <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {quest.funky_action || quest.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-4 w-4" />{quest.estimated_time || quest.time}</span>
          <span className="sq-mono font-bold text-[hsl(var(--ocean-700))]">+{quest.xp} XP</span>
          {quest.reward && <span className="truncate font-semibold text-[hsl(var(--gold-700))]">{quest.reward}</span>}
        </div>
      </div>
    </article>
  );
}

export default AppQuestCard;
