import { useNavigate } from 'react-router-dom';
import { Clock, Heart, MapPin, Zap } from 'lucide-react';
import type { Quest } from '@/lib/quests';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useSignInPrompt } from '@/contexts/SignInPromptContext';
import { useToast } from '@/hooks/use-toast';

export function AppQuestCard({ quest }: { quest: Quest }) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { promptSignIn } = useSignInPrompt();
  const { toast } = useToast();
  const navigate = useNavigate();

  const favorited = isFavorite(quest.id);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      promptSignIn('save favorites');
      return;
    }
    toggleFavorite(quest.id);
    toast({
      title: favorited ? 'Removed from favorites' : 'Saved to favorites ❤️',
      description: quest.title,
    });
  };

  return (
    <>
      <div
        onClick={() => navigate(`/quests/${quest.id}`)}
        className="glass-card hover-lift group cursor-pointer overflow-hidden"
      >
        <div className="relative h-40 overflow-hidden">
          <img
            src={quest.image}
            alt={quest.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground">
            {quest.category}
          </Badge>
          <button
            onClick={handleFavorite}
            aria-label={favorited ? 'Remove favorite' : 'Add favorite'}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/60 backdrop-blur-md transition-transform active:scale-90"
          >
            <Heart
              className={cn(
                'h-5 w-5 transition-colors',
                favorited ? 'fill-coral text-coral' : 'text-foreground',
              )}
            />
          </button>
        </div>
        <div className="p-4">
          <h3 className="mb-2 line-clamp-1 font-poppins text-base font-semibold">{quest.title}</h3>
          <div className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span>{quest.neighborhood}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {quest.time}
            </span>
            <span className="flex items-center gap-1 text-turquoise">
              <Zap className="h-4 w-4" />
              {quest.xp} XP
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export default AppQuestCard;
