import { useState } from 'react';
import { Clock, Gift, Heart, MapPin, Zap } from 'lucide-react';
import type { Quest } from '@/lib/quests';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useSignInPrompt } from '@/contexts/SignInPromptContext';
import { useToast } from '@/hooks/use-toast';

/**
 * In-app quest card with a working favorite toggle and a detail dialog.
 * Signed-out users are nudged into the sign-in prompt for the conversion
 * actions (favorite, start quest).
 */
export function AppQuestCard({ quest }: { quest: Quest }) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { promptSignIn } = useSignInPrompt();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

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

  const handleStart = () => {
    if (!user) {
      setOpen(false);
      promptSignIn('start this quest');
      return;
    }
    setOpen(false);
    toast({ title: 'Quest started! 🧭', description: `Good luck with “${quest.title}”.` });
  };

  return (
    <>
      <div
        onClick={() => setOpen(true)}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm overflow-hidden p-0">
          <div className="relative h-44">
            <img src={quest.image} alt={quest.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
            <Badge className="absolute left-4 top-4 bg-primary text-primary-foreground">
              {quest.category}
            </Badge>
          </div>
          <div className="space-y-4 p-5">
            <DialogHeader>
              <DialogTitle className="text-left font-poppins text-xl">{quest.title}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              {quest.neighborhood}, Miami
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat icon={<Gift className="h-4 w-4 text-coral" />} label="Reward" value={quest.reward} />
              <Stat icon={<Zap className="h-4 w-4 text-turquoise" />} label="XP" value={`${quest.xp} XP`} />
              {quest.address ? (
                <div className="col-span-2">
                  <Stat icon={<MapPin className="h-4 w-4 text-coral" />} label="Address" value={quest.address} />
                </div>
              ) : quest.distance ? (
                <Stat icon={<MapPin className="h-4 w-4 text-coral" />} label="Distance" value={quest.distance} />
              ) : null}
              <Stat icon={<Clock className="h-4 w-4 text-turquoise" />} label="Time" value={quest.time} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleFavorite}>
                <Heart className={cn('mr-2 h-4 w-4', favorited && 'fill-coral text-coral')} />
                {favorited ? 'Saved' : 'Save'}
              </Button>
              <Button className="flex-1" onClick={handleStart}>
                Start Quest
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-muted/30 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

export default AppQuestCard;
