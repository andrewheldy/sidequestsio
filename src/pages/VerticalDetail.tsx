import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import AnimatedSection from '@/components/AnimatedSection';
import QuestCard from '@/components/cards/QuestCard';
import CommunityNoteCard from '@/components/cards/CommunityNoteCard';
import CTASection from '@/components/CTASection';
import { Button } from '@/components/ui/button';

const verticalData: Record<string, {
  title: string;
  icon: string;
  description: string;
  hero: string;
  quests: Array<{
    title: string;
    location: string;
    category: string;
    duration: string;
    image: string;
  }>;
  communityNotes: Array<{
    author: string;
    location: string;
    message: string;
    image?: string;
  }>;
}> = {
  coffee: {
    title: 'Coffee & Cafés',
    icon: '☕',
    description: 'From hidden rooftop espresso bars to cozy neighborhood gems, discover the coffee spots that locals love.',
    hero: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&h=600&fit=crop',
    quests: [
      { title: 'Hidden Rooftop Coffee', location: 'Miami', category: 'Coffee', duration: '30 min', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop' },
      { title: 'Secret Garden Café', location: 'Miami', category: 'Coffee', duration: '45 min', image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop' },
      { title: 'Vintage Coffee House', location: 'Miami', category: 'Coffee', duration: '1 hour', image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop' },
    ],
    communityNotes: [
      { author: 'CoffeeLover', location: 'A coffee shop', message: 'The back patio is the real gem. Go early for a quiet seat.', image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&h=200&fit=crop' },
      { author: 'Barista Fan', location: 'A coffee shop', message: 'Ask what\'s not on the menu. Trust me.' },
    ],
  },
  art: {
    title: 'Art & Galleries',
    icon: '🎨',
    description: 'Explore street art, underground galleries, and creative spaces that showcase the city\'s artistic soul.',
    hero: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=1200&h=600&fit=crop',
    quests: [
      { title: 'Street Art Walking Tour', location: 'Miami', category: 'Art', duration: '2 hours', image: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=400&h=300&fit=crop' },
      { title: 'Gallery Night Walk', location: 'Miami', category: 'Art', duration: '3 hours', image: 'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=400&h=300&fit=crop' },
      { title: 'Hidden Murals Hunt', location: 'Miami', category: 'Art', duration: '1.5 hours', image: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=400&h=300&fit=crop' },
    ],
    communityNotes: [
      { author: 'ArtSeeker', location: 'A mural alley', message: 'Come early morning for the best photos. The light is perfect around 8am.', image: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=400&h=200&fit=crop' },
      { author: 'Creative', location: 'A museum', message: 'The outdoor area is often quiet on weekday mornings.' },
    ],
  },
  music: {
    title: 'Music & Nightlife',
    icon: '🎵',
    description: 'Find the best live music venues, underground scenes, and unforgettable nights out.',
    hero: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&h=600&fit=crop',
    quests: [
      { title: 'Jazz Underground', location: 'Miami', category: 'Music', duration: '3 hours', image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=300&fit=crop' },
      { title: 'Vinyl Record Hunt', location: 'Miami', category: 'Music', duration: '2 hours', image: 'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=400&h=300&fit=crop' },
      { title: 'Live Music Crawl', location: 'Miami', category: 'Music', duration: '4 hours', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop' },
    ],
    communityNotes: [
      { author: 'MusicFan', location: 'A music bar', message: 'Arrive early if you want a spot near the stage.', image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=200&fit=crop' },
      { author: 'NightOwl', location: 'A music venue', message: 'Arrive early to avoid the line.' },
    ],
  },
  outdoors: {
    title: 'Beaches & Outdoors',
    icon: '🏖️',
    description: 'Adventure awaits at hidden beaches, scenic trails, and natural wonders just waiting to be discovered.',
    hero: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=600&fit=crop',
    quests: [
      { title: 'Sunset Beach Meditation', location: 'Miami', category: 'Outdoors', duration: '1 hour', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop' },
      { title: 'Mountain Trail Sunrise', location: 'Miami', category: 'Outdoors', duration: '4 hours', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop' },
      { title: 'Hidden Waterfall Hike', location: 'Miami', category: 'Outdoors', duration: '3 hours', image: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=400&h=300&fit=crop' },
    ],
    communityNotes: [
      { author: 'Hiker', location: 'A coastal trail', message: 'Take the left fork at the second junction. Hidden bench with the best view.', image: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=400&h=200&fit=crop' },
      { author: 'BeachBum', location: 'A beach', message: 'The north end is less crowded and has tide pools at low tide.' },
    ],
  },
  everyday: {
    title: 'Everyday Exploration',
    icon: '🚶',
    description: 'Turn your daily routine into an adventure. Discover hidden gems in your own neighborhood.',
    hero: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=600&fit=crop',
    quests: [
      { title: 'Vintage Bookstore Crawl', location: 'Miami', category: 'Everyday', duration: '2 hours', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop' },
      { title: 'Secret Stairway Walk', location: 'Miami', category: 'Everyday', duration: '1.5 hours', image: 'https://images.unsplash.com/photo-1516156008625-3a9d6067fab5?w=400&h=300&fit=crop' },
      { title: 'Hidden Park Discovery', location: 'Miami', category: 'Everyday', duration: '1 hour', image: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400&h=300&fit=crop' },
    ],
    communityNotes: [
      { author: 'Local', location: 'A bookstore', message: 'Ask the staff what they\'d recommend.', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop' },
      { author: 'Walker', location: 'A hillside stairway', message: 'Look up halfway through the climb.' },
    ],
  },
  events: {
    title: 'Events & Festivals',
    icon: '🎪',
    description: 'Pop-up experiences, community gatherings, and festivals that bring people together.',
    hero: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=1200&h=600&fit=crop',
    quests: [
      { title: 'Food Truck Festival', location: 'Miami', category: 'Events', duration: '4 hours', image: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=400&h=300&fit=crop' },
      { title: 'Night Market Adventure', location: 'Miami', category: 'Events', duration: '3 hours', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop' },
      { title: 'Pop-Up Art Show', location: 'Miami', category: 'Events', duration: '2 hours', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop' },
    ],
    communityNotes: [
      { author: 'Foodie', location: 'A food truck night', message: 'The longest line is usually worth it.', image: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=400&h=200&fit=crop' },
      { author: 'EventHopper', location: 'A flea market', message: 'Arrive before 10am for the best vintage finds. Bring cash!' },
    ],
  },
};

const VerticalDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const data = verticalData[slug || ''];

  if (!data) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-poppins text-2xl text-foreground mb-4">Vertical not found</h1>
          <Button asChild>
            <Link to="/verticals">Back to Verticals</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Hero */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${data.hero})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />

        <div className="container relative">
          <AnimatedSection>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="mb-6 text-foreground hover:bg-muted/50"
            >
              <Link to="/verticals">
                <ArrowLeft className="w-4 h-4 mr-2" />
                All Verticals
              </Link>
            </Button>

            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl">{data.icon}</span>
              <h1 className="font-poppins font-bold text-4xl md:text-5xl text-foreground">
                {data.title}
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl">{data.description}</p>
          </AnimatedSection>
        </div>
      </section>

      {/* Sample content only: made-up examples, not real quests, places or visitors. */}
      {/* Quests */}
      <section className="py-16 md:py-24">
        <div className="container">
          <AnimatedSection>
            <h2 className="font-poppins font-bold text-2xl md:text-3xl text-foreground mb-8">
              Example {data.title} Quests
            </h2>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.quests.map((quest, index) => (
              <QuestCard key={quest.title} {...quest} delay={index * 100} />
            ))}
          </div>
        </div>
      </section>

      {/* Community Notes */}
      <section className="py-16 md:py-24 bg-muted/20">
        <div className="container">
          <AnimatedSection>
            <h2 className="font-poppins font-bold text-2xl md:text-3xl text-foreground mb-8">
              Example Community Notes for {data.title}
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-6">
            {data.communityNotes.map((communityNote, index) => (
              <CommunityNoteCard key={`${communityNote.author}-${index}`} {...communityNote} delay={index * 100} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        title={`Ready to Explore ${data.title}?`}
        description="Find a quest in this category and leave a community note for the next explorer."
        primaryAction={{ label: 'Find a Quest', href: '/quests' }}
        variant="sand"
      />
    </Layout>
  );
};

export default VerticalDetail;