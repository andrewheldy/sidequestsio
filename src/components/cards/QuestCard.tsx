import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import QuestImage from '@/components/QuestImage';

interface QuestCardProps {
  title: string;
  location: string;
  category: string;
  duration?: string;
  participants?: number;
  concept?: string;
  xp?: number;
  points?: number;
  physicalReward?: string;
  image: string;
  delay?: number;
  className?: string;
  questId?: string;
  featured?: boolean;
}

export function QuestCard({
  title,
  location,
  category,
  duration,
  concept,
  xp,
  points,
  physicalReward,
  image,
  className,
  questId,
  featured = false,
}: QuestCardProps) {
  const dest = questId ? `/quests/${questId}` : '/app/explore';

  return (
    <Link
      to={dest}
      className={cn(
        'quest-card group block overflow-hidden rounded-2xl border border-border bg-card focus-visible:outline-none',
        featured && 'md:grid md:grid-cols-[1.25fr_1fr]',
        className,
      )}
      aria-label={`Open quest: ${title}`}
    >
      <div className={cn('relative aspect-[4/3] overflow-hidden bg-muted', featured && 'md:aspect-auto md:min-h-[360px]')}>
        <QuestImage src={image} alt="" category={category} className="quest-card__image" />
        <span className="sq-overline absolute left-4 top-4 rounded-lg bg-[hsl(var(--midnight-900))] px-2.5 py-2 text-white">
          {category}
        </span>
      </div>

      <div className={cn('flex flex-col p-5', featured && 'justify-between md:p-8')}>
        <div>
          <div className="mb-3 flex items-start justify-between gap-4">
            <h3 className={cn('font-display text-xl font-bold leading-tight tracking-[-0.035em]', featured && 'text-3xl')}>
              {title}
            </h3>
            <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <MapPin className="h-4 w-4 text-[hsl(var(--ocean-500))]" aria-hidden />
            <span>{location}</span>
          </div>
          {concept && <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{concept}</p>}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-sm">
          {duration && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" aria-hidden /> {duration}
            </span>
          )}
          {typeof xp === 'number' && (
            <span className="sq-mono font-bold text-[hsl(var(--ocean-700))]">+{xp} XP</span>
          )}
          {typeof points === 'number' && (
            <span className="sq-mono font-bold text-[hsl(var(--gold-700))]">+{points} Points</span>
          )}
          {physicalReward && <span className="w-full text-xs text-muted-foreground">Reward: {physicalReward}</span>}
        </div>
      </div>
    </Link>
  );
}

export default QuestCard;
