import Layout from '@/components/layout/Layout';
import AnimatedSection from '@/components/AnimatedSection';
import VerticalCard from '@/components/cards/VerticalCard';
import CTASection from '@/components/CTASection';

const verticals = [
  {
    title: 'Coffee & Cafés',
    icon: '☕',
    description: 'Discover the best local coffee spots, hidden rooftops, and cozy corners perfect for your next caffeine adventure.',
    href: '/verticals/coffee',
    color: 'coral' as const,
  },
  {
    title: 'Art & Galleries',
    icon: '🎨',
    description: 'Explore street art, underground galleries, public installations, and creative spaces that inspire.',
    href: '/verticals/art',
    color: 'turquoise' as const,
  },
  {
    title: 'Music & Nightlife',
    icon: '🎵',
    description: 'Find live music venues, jazz clubs, underground scenes, and the best spots for an unforgettable night.',
    href: '/verticals/music',
    color: 'sandstone' as const,
  },
  {
    title: 'Beaches & Outdoors',
    icon: '🏖️',
    description: 'Adventure awaits at hidden beaches, scenic trails, secret viewpoints, and natural wonders.',
    href: '/verticals/outdoors',
    color: 'coral' as const,
  },
  {
    title: 'Everyday Exploration',
    icon: '🚶',
    description: 'Turn your daily routine into an adventure. Discover gems in your neighborhood you never knew existed.',
    href: '/verticals/everyday',
    color: 'turquoise' as const,
  },
  {
    title: 'Events & Festivals',
    icon: '🎪',
    description: 'Pop-up experiences, community gatherings, conferences, and festivals that bring people together.',
    href: '/verticals/events',
    color: 'sandstone' as const,
  },
];

const Verticals = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container">
          <AnimatedSection>
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="font-poppins font-bold text-4xl md:text-5xl text-foreground mb-6">
                One Platform.{' '}
                <span className="text-gradient-coral">Infinite Worlds.</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Explore quests across different categories tailored to your interests.
                Each vertical is a gateway to unique experiences.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Verticals Grid */}
      <section className="py-12 md:py-20">
        <div className="container">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {verticals.map((vertical, index) => (
              <VerticalCard key={vertical.title} {...vertical} delay={index * 100} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        title="Can't Find Your Niche?"
        description="We're always expanding. Have a vertical in mind that doesn't exist yet? Let us know and help shape the future of SideQuests."
        primaryAction={{ label: 'Contact Us', href: '/partnerships' }}
        variant="coral"
      />
    </Layout>
  );
};

export default Verticals;