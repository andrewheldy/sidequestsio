import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import AnimatedSection from '@/components/AnimatedSection';
import QuestCard from '@/components/cards/QuestCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CTASection from '@/components/CTASection';
import { useLanguage } from '@/contexts/LanguageContext';
import { NearbyQuestsMapSection } from '@/components/map';
import { Loading, EmptyState } from '@/components/app/ui';
import { useActiveQuests } from '@/hooks/useActiveQuests';

const CATEGORY_FILTERS = ['All', 'Foodie', 'Culture', 'Nightlife', 'Hidden Gems', 'Wellness', 'Outdoor', 'Community'] as const;
type CategoryFilter = typeof CATEGORY_FILTERS[number];

const Quests = () => {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { quests, isLoading, isError } = useActiveQuests();

  const filteredQuests = quests.filter((quest) => {
    const matchesCategory = activeCategory === 'All' || quest.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      quest.title.toLowerCase().includes(q) ||
      quest.neighborhood.toLowerCase().includes(q) ||
      (quest.address ?? '').toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-to-b from-muted/30 to-transparent py-16 md:py-24">
        <div className="container">
          <AnimatedSection>
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-6 font-poppins font-bold text-4xl md:text-5xl text-foreground">
                {t.quests.title}
              </h1>
              <p className="mb-10 text-lg text-muted-foreground">
                {t.quests.subtitle}
              </p>

              {/* Search */}
              <div className="relative mx-auto max-w-xl">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t.quests.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-14 rounded-xl border-border bg-card pl-12 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Interactive Map */}
      <section className="py-12">
        <div className="container">
          <AnimatedSection>
            <NearbyQuestsMapSection
              quests={quests}
              title="Explore the Map"
              subtitle="Quests are live across Miami. Tap any pin to preview — use ⊕ to find ones near you."
              height="420px"
            />
          </AnimatedSection>
        </div>
      </section>

      {/* Filters & Grid */}
      <section className="py-12">
        <div className="container">
          {/* Category Filters */}
          <AnimatedSection>
            <div className="mb-8 flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
              <Filter className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              {CATEGORY_FILTERS.map((cat) => (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory(cat)}
                  className={
                    activeCategory === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }
                >
                  {cat}
                </Button>
              ))}
            </div>
          </AnimatedSection>

          {/* Quest Grid */}
          {isLoading ? (
            <Loading />
          ) : isError ? (
            <EmptyState
              title="Couldn't load quests"
              description="We're having trouble reaching the server. Please try again shortly."
            />
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredQuests.map((quest, index) => (
                  <QuestCard
                    key={quest.id}
                    questId={quest.id}
                    title={quest.title}
                    location={quest.address ?? quest.neighborhood}
                    category={quest.category}
                    concept={quest.description ?? ''}
                    xp={quest.xp}
                    image={quest.image}
                    delay={index * 80}
                  />
                ))}
              </div>

              {filteredQuests.length === 0 && (
                <div className="py-20 text-center">
                  <p className="text-lg text-muted-foreground">{t.quests.noResults}</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* CTA */}
      <CTASection
        title={t.quests.cta.title}
        description={t.quests.cta.description}
        primaryAction={{ label: t.quests.cta.button, href: '/hosts' }}
        variant="turquoise"
      />
    </Layout>
  );
};

export default Quests;
