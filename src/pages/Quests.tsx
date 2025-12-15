import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import AnimatedSection from '@/components/AnimatedSection';
import QuestCard from '@/components/cards/QuestCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CTASection from '@/components/CTASection';

const categories = ['All', 'Coffee', 'Art', 'Music', 'Outdoors', 'Events', 'Everyday'];

const allQuests = [
  {
    title: 'Hidden Rooftop Coffee',
    location: 'Downtown Arts District',
    category: 'Coffee',
    duration: '30 min',
    participants: 127,
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop',
  },
  {
    title: 'Street Art Walking Tour',
    location: 'Mission District',
    category: 'Art',
    duration: '2 hours',
    participants: 89,
    image: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=400&h=300&fit=crop',
  },
  {
    title: 'Sunset Beach Meditation',
    location: 'Ocean Beach',
    category: 'Outdoors',
    duration: '1 hour',
    participants: 203,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop',
  },
  {
    title: 'Jazz Underground',
    location: 'North Beach',
    category: 'Music',
    duration: '3 hours',
    participants: 56,
    image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=300&fit=crop',
  },
  {
    title: 'Vintage Bookstore Crawl',
    location: 'Hayes Valley',
    category: 'Everyday',
    duration: '2 hours',
    participants: 142,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
  },
  {
    title: 'Food Truck Festival',
    location: 'SoMa',
    category: 'Events',
    duration: '4 hours',
    participants: 315,
    image: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=400&h=300&fit=crop',
  },
  {
    title: 'Secret Garden Café',
    location: 'Russian Hill',
    category: 'Coffee',
    duration: '45 min',
    participants: 78,
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop',
  },
  {
    title: 'Gallery Night Walk',
    location: 'SOMA Arts',
    category: 'Art',
    duration: '3 hours',
    participants: 167,
    image: 'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=400&h=300&fit=crop',
  },
  {
    title: 'Mountain Trail Sunrise',
    location: 'Mt. Tamalpais',
    category: 'Outdoors',
    duration: '4 hours',
    participants: 234,
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop',
  },
];

const Quests = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredQuests = allQuests.filter((quest) => {
    const matchesCategory = activeCategory === 'All' || quest.category === activeCategory;
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
                Discover Your Next <span className="text-gradient-coral">Quest</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-10">
                Explore curated adventures in your city. Each quest is a doorway to something unexpected.
              </p>

              {/* Search */}
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search quests or locations..."
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
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={activeCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory(category)}
                  className={
                    activeCategory === category
                      ? 'bg-primary text-primary-foreground'
                      : 'border-border hover:bg-muted text-muted-foreground'
                  }
                >
                  {category}
                </Button>
              ))}
            </div>
          </AnimatedSection>

          {/* Quest Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuests.map((quest, index) => (
              <QuestCard key={quest.title} {...quest} delay={index * 80} />
            ))}
          </div>

          {filteredQuests.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No quests found. Try a different search or category.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <CTASection
        title="Got a Quest Idea?"
        description="Know a hidden gem that deserves to be discovered? Become a quest host and share it with the community."
        primaryAction={{ label: 'Become a Host', href: '/hosts' }}
        variant="turquoise"
      />
    </Layout>
  );
};

export default Quests;