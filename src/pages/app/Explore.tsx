import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ListFilter, Map, Search } from 'lucide-react';
import { QUEST_CATEGORIES } from '@/lib/quests';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import AppQuestCard from '@/components/app/AppQuestCard';
import { EmptyState } from '@/components/app/ui';
import { useActiveQuests } from '@/hooks/useActiveQuests';
import { useAuth } from '@/contexts/AuthContext';
import logoHorizontal from '../../../brand/logos/logo-horizontal.svg';

const Explore = () => {
  const { profile } = useAuth();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All');
  const { quests: allQuests, isLoading, isError } = useActiveQuests();

  const quests = useMemo(
    () => allQuests.filter((quest) => {
      const matchesCategory = category === 'All' || quest.category === category;
      const needle = query.trim().toLowerCase();
      const matchesQuery = !needle || [quest.title, quest.neighborhood, quest.address, quest.venueName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
      return matchesCategory && matchesQuery;
    }),
    [allQuests, query, category],
  );

  const featured = quests[0];
  const nearby = quests.slice(1);

  return (
    <div className="space-y-7">
      <header className="flex items-center justify-between pt-1">
        <Link to="/" aria-label="sidequests home"><img src={logoHorizontal} alt="sidequests" className="w-[136px]" /></Link>
        <Link to="/app/map" className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-bold">
          <Map className="h-4 w-4 text-[hsl(var(--ocean-500))]" /> Map
        </Link>
      </header>

      <section>
        <p className="sq-overline mb-2 text-[hsl(var(--ocean-700))]">
          {profile?.display_name ? `For ${profile.display_name}` : 'Curated in Miami'}
        </p>
        <h1 className="font-display text-[2.35rem] font-bold leading-[0.98] tracking-[-0.05em]">What’s worth leaving the house for?</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">Pick a nearby detour. We’ll show you what to do when you get there.</p>
      </section>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search quests or neighborhoods"
          placeholder="Search quests or neighborhoods"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-12 rounded-xl border-input bg-card pl-12 text-base"
        />
      </div>

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-hide" aria-label="Quest categories">
        {QUEST_CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            aria-pressed={category === item}
            className={cn(
              'min-h-10 whitespace-nowrap rounded-full border px-4 text-sm font-semibold',
              category === item
                ? 'border-[hsl(var(--midnight-900))] bg-[hsl(var(--midnight-900))] text-white'
                : 'border-border bg-card text-muted-foreground',
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4" role="status" aria-label="Loading quests">
          <div className="aspect-[5/4] rounded-3xl bg-muted" />
          <div className="h-5 w-2/3 rounded bg-muted" />
          <div className="h-4 w-1/2 rounded bg-muted" />
        </div>
      ) : isError ? (
        <EmptyState title="The quest map is taking a breather" description="We couldn’t reach the live quest list. Try again in a moment." />
      ) : quests.length === 0 ? (
        <EmptyState title="No quests on this path yet" description="Try another neighborhood, category, or search." />
      ) : (
        <div className="space-y-8">
          {featured && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div><p className="sq-overline text-[hsl(var(--coral-600))]">Start here</p><h2 className="mt-1 text-xl">Featured detour</h2></div>
                <ListFilter className="h-5 w-5 text-muted-foreground" aria-hidden />
              </div>
              <AppQuestCard quest={featured} featured />
            </section>
          )}

          {nearby.length > 0 && (
            <section>
              <div className="mb-3 flex items-end justify-between gap-4">
                <div><p className="sq-overline text-[hsl(var(--ocean-700))]">More nearby</p><h2 className="mt-1 text-xl">Keep wandering</h2></div>
                <Link to="/app/map" className="flex min-h-11 items-center gap-1 text-sm font-bold text-[hsl(var(--ocean-700))]">Map <ArrowRight className="h-4 w-4" /></Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {nearby.map((quest) => <AppQuestCard key={quest.id} quest={quest} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default Explore;
