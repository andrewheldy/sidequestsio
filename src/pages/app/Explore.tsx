import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { QUESTS, QUEST_CATEGORIES } from '@/lib/quests';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import AppQuestCard from '@/components/app/AppQuestCard';
import { useAuth } from '@/contexts/AuthContext';

const Explore = () => {
  const { profile } = useAuth();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All');

  const quests = useMemo(
    () =>
      QUESTS.filter((q) => {
        const matchesCategory = category === 'All' || q.category === category;
        const matchesQuery =
          q.title.toLowerCase().includes(query.toLowerCase()) ||
          q.neighborhood.toLowerCase().includes(query.toLowerCase());
        return matchesCategory && matchesQuery;
      }),
    [query, category],
  );

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-muted-foreground">
          {profile?.display_name ? `Hey ${profile.display_name},` : 'Welcome,'}
        </p>
        <h1 className="font-poppins text-2xl font-bold">Explore Miami</h1>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search quests or neighborhoods"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 pl-10"
        />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {QUEST_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              'whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition-colors',
              category === c
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card/50 text-muted-foreground hover:text-foreground',
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {quests.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {quests.map((q) => (
            <AppQuestCard key={q.id} quest={q} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-muted-foreground">
          No quests match that search yet.
        </p>
      )}
    </div>
  );
};

export default Explore;
