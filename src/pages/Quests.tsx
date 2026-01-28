import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import AnimatedSection from '@/components/AnimatedSection';
import QuestCard from '@/components/cards/QuestCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CTASection from '@/components/CTASection';
import { useLanguage } from '@/contexts/LanguageContext';

const categoryKeys = ['all', 'coffee', 'art', 'music', 'outdoors', 'events', 'everyday'] as const;

const allQuests = [
  {
    title: 'Hidden Rooftop Coffee',
    location: 'Downtown Arts District',
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
    image: 'https://images.unsplash.com/photo-1569700296499-d5671c74cb3d?w=400&h=300&fit=crop',
  },
  {
    title: 'Sunset Beach Meditation',
    location: 'Ocean Beach',
    categoryKey: 'outdoors' as const,
    duration: '1 hour',
    participants: 203,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop',
  },
  {
    title: 'Jazz Underground',
    location: 'North Beach',
    categoryKey: 'music' as const,
    duration: '3 hours',
    participants: 56,
    image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=300&fit=crop',
  },
  {
    title: 'Vintage Bookstore Crawl',
    location: 'Hayes Valley',
    categoryKey: 'everyday' as const,
    duration: '2 hours',
    participants: 142,
    image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=300&fit=crop',
  },
  {
    title: 'Food Truck Festival',
    location: 'SoMa',
    categoryKey: 'events' as const,
    duration: '4 hours',
    participants: 315,
    image: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=400&h=300&fit=crop',
  },
  {
    title: 'Secret Garden Café',
    location: 'Russian Hill',
    categoryKey: 'coffee' as const,
    duration: '45 min',
    participants: 78,
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop',
  },
  {
    title: 'Gallery Night Walk',
    location: 'SOMA Arts',
    categoryKey: 'art' as const,
    duration: '3 hours',
    participants: 167,
    image: 'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=400&h=300&fit=crop',
  },
  {
    title: 'Mountain Trail Sunrise',
    location: 'Mt. Tamalpais',
    categoryKey: 'outdoors' as const,
    duration: '4 hours',
    participants: 234,
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop',
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
    const matchesSearch = quest.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quest.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <Layout>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container">
          <AnimatedSection>
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="font-poppins font-bold text-4xl md:text-5xl text-foreground mb-6">
                {t.quests.title}
              </h1>
              <p className="text-lg text-muted-foreground mb-10">
                {t.quests.subtitle}
              </p>

              {/* Search */}
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t.quests.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl"
                />
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Filters & Grid */}
      <section className="py-12">
        <div className="container">
          {/* Category Filters */}
          <AnimatedSection>
            <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-4 scrollbar-hide">
              <Filter className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              {categoryKeys.map((key) => (
                <Button
                  key={key}
                  variant={activeCategory === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory(key)}
                  className={
                    activeCategory === key
                      ? 'bg-primary text-primary-foreground'
                      : 'border-border hover:bg-muted text-muted-foreground'
                  }
                >
                  {categoryLabels[key]}
                </Button>
              ))}
            </div>
          </AnimatedSection>

          {/* Quest Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">{t.quests.noResults}</p>
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
