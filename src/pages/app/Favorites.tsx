import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { MIAMI_QUESTS } from '@/data/miami/toQuest';
import { useFavorites } from '@/contexts/FavoritesContext';
import { Button } from '@/components/ui/button';
import AppQuestCard from '@/components/app/AppQuestCard';

const Favorites = () => {
  const { favorites } = useFavorites();
  const saved = MIAMI_QUESTS.filter((q) => favorites.includes(q.id));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-poppins text-2xl font-bold">Your Favorites</h1>
        <p className="text-sm text-muted-foreground">Quests you've saved for later.</p>
      </header>

      {saved.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {saved.map((q) => (
            <AppQuestCard key={q.id} quest={q} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/40">
            <Heart className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-poppins font-semibold">No favorites yet</p>
            <p className="text-sm text-muted-foreground">
              Tap the heart on any quest to save it here.
            </p>
          </div>
          <Button asChild>
            <Link to="/app/explore">Explore quests</Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default Favorites;
