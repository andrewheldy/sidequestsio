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
import { QUESTS } from '@/lib/quests';

const categoryKeys = ['all', 'coffee', 'art', 'music', 'outdoors', 'events', 'everyday'] as const;

const allQuests = [
  {
    title: 'Oceanfront Espresso Bar',
    location: 'South Beach',
    categoryKey: 'coffee' as const,
    duration: '30 min',
    participants: 127,
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop',
  },
  {
    title: 'Street Art Walking Tour',
    location: 'Wynwood Walls',
    categoryKey: 'art' as const,
    duration: '2 hours',
    participants: 89,
    image: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=400&h=300&fit=crop',
  },
  {
    title: 'Sunrise Beach Yoga',
    location: 'Miami Beach',
    categoryKey: 'outdoors' as const,
    duration: '1 hour',
    participants: 203,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop',
  },
  {
    title: 'Latin Jazz Lounge',
    location: 'Downtown Miami',
    categoryKey: 'music' as const,
    duration: '3 hours',
    participants: 56,
    image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=300&fit=crop',
  },
  {
    title: 'Indie Bookshop Tour',
    location: 'Coral Gables',
    categoryKey: 'everyday' as const,
    duration: '2 hours',
    participants: 142,
    image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=300&fit=crop',
  },
  {
    title: 'Calle Ocho Food Fest',
    location: 'Design District',
    categoryKey: 'events' as const,
    duration: '4 hours',
    participants: 315,
    image: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=400&h=300&fit=crop',
  },
  {
    title: 'Hidden Courtyard Café',
    location: 'Coral Gables',
    categoryKey: 'coffee' as const,
    duration: '45 min',
    participants: 78,
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop',
  },
  {
    title: 'Art Basel Gallery Walk',
    location: 'Design District',
    categoryKey: 'art' as const,
    duration: '3 hours',
    participants: 167,
    image: 'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=400&h=300&fit=crop',
  },
];

const Quests = () => {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categoryLabels: Record<string, string> = {
    all: t.quests.filters.all,
    coffee: t.quests.filters.coffee,
    art: t.quests.filters.art,
    music: t.quests.filters.music,
    outdoors: t.quests.filters.outdoors,
    everyday: t.quests.filters.everyday,
    events: t.quests.filters.events,
  };

  const filteredQuests = allQuests.filter((quest) => {
    const matchesCategory = activeCategory === 'all' || quest.categoryKey === activeCategory;
    const matchesSearch =
      quest.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quest.location.toLowerCase().includes(searchQuery.toLowerCase());
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
              quests={QUESTS}
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
              {categoryKeys.map((key) => (
                <Button
                  key={key}
                  variant={activeCategory === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory(key)}
                  className={
                    activeCategory === key
                      ? 'bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }
                >
                  {categoryLabels[key]}
                </Button>
              ))}
            </div>
          </AnimatedSection>

          {/* Quest Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredQuests.map((quest, index) => (
              <QuestCard
                key={quest.title}
                title={quest.title}
                location={quest.location}
                category={categoryLabels[quest.categoryKey]}
                duration={quest.duration}
                participants={quest.participants}
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
