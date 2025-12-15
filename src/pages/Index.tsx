import { Link } from 'react-router-dom';
import { ArrowRight, Search, MapPin, BookOpen, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Layout from '@/components/layout/Layout';
import AnimatedSection from '@/components/AnimatedSection';
import StepCard from '@/components/cards/StepCard';
import QuestCard from '@/components/cards/QuestCard';
import BreadcrumbCard from '@/components/cards/BreadcrumbCard';
import VerticalCard from '@/components/cards/VerticalCard';
import FeatureCard from '@/components/cards/FeatureCard';
import CTASection from '@/components/CTASection';
import dotlingLogo from '@/assets/dotling-logo.jpg';
import breadcrumbsMascot from '@/assets/breadcrumbs-mascot.jpg';

const howItWorksSteps = [
  {
    icon: <Search className="w-7 h-7" />,
    title: 'Find a Quest',
    description: 'Browse curated quests in your area — coffee shops, art spots, hidden gems, and more.',
  },
  {
    icon: <MapPin className="w-7 h-7" />,
    title: 'Check In',
    description: 'Visit the location and check in. No GPS tracking, just a simple confirmation.',
  },
  {
    icon: <Compass className="w-7 h-7" />,
    title: 'Complete & Discover',
    description: 'Unlock achievements, discover nearby quests, and build your explorer profile.',
  },
  {
    icon: <BookOpen className="w-7 h-7" />,
    title: 'Leave a Breadcrumb',
    description: 'Share a quick note or photo for the next explorer. No likes, no followers — just community.',
  },
];

const featuredQuests = [
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
];

const sampleBreadcrumbs = [
  {
    author: 'Maya',
    location: 'Ritual Coffee Roasters',
    message: 'The back patio is the real gem here. Ask about their single-origin Ethiopian — life changing.',
    image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&h=200&fit=crop',
  },
  {
    author: 'James',
    location: 'Clarion Alley',
    message: 'Come early morning for the best photos. The light hits the murals perfectly around 8am.',
  },
  {
    author: 'Sofia',
    location: 'Lands End Trail',
    message: 'Take the left fork at the second junction. There\'s a hidden bench with the best view.',
  },
];

const verticals = [
  { title: 'Coffee & Cafés', icon: '☕', description: 'Discover the best local coffee spots and hidden gems.', href: '/verticals/coffee', color: 'coral' as const },
  { title: 'Art & Galleries', icon: '🎨', description: 'Explore street art, galleries, and creative spaces.', href: '/verticals/art', color: 'turquoise' as const },
  { title: 'Music & Nightlife', icon: '🎵', description: 'Find live music venues and underground scenes.', href: '/verticals/music', color: 'sandstone' as const },
  { title: 'Beaches & Outdoors', icon: '🏖️', description: 'Adventure awaits in nature and coastal spots.', href: '/verticals/outdoors', color: 'coral' as const },
  { title: 'Everyday Exploration', icon: '🚶', description: 'Turn your daily routine into an adventure.', href: '/verticals/everyday', color: 'turquoise' as const },
  { title: 'Events & Festivals', icon: '🎪', description: 'Pop-up experiences and community gatherings.', href: '/verticals/events', color: 'sandstone' as const },
];

const breadcrumbsPositive = [
  'Short notes and photos left at quest locations',
  'Anonymous and privacy-first by design',
  'Helpful tips from real explorers',
  'Community signal, not personal branding',
];

const breadcrumbsNegative = [
  'No followers, no feeds, no algorithm',
  'No likes, comments, or engagement metrics',
  'No personal profiles or social graphs',
  'No data harvesting or targeted ads',
];

const Index = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo via-indigo-light to-background" />
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-coral/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-turquoise/10 rounded-full blur-3xl" />

        <div className="container relative z-10 py-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Dotling accent */}
            <AnimatedSection delay={0}>
              <div className="inline-flex items-center gap-3 bg-muted/30 backdrop-blur-sm border border-border/50 rounded-full px-4 py-2 mb-8">
                <img src={dotlingLogo} alt="Dotling" className="w-8 h-8 rounded-full object-cover" />
                <span className="text-sm text-muted-foreground">Privacy-first social discovery</span>
              </div>
            </AnimatedSection>

            {/* Headline */}
            <AnimatedSection delay={100}>
              <h1 className="font-poppins font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-foreground mb-6 leading-tight">
                There's Always a{' '}
                <span className="text-gradient-coral">Side Quest</span>{' '}
                to Explore
              </h1>
            </AnimatedSection>

            {/* Subheadline */}
            <AnimatedSection delay={200}>
              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                Discover hidden gems in your city. Leave breadcrumbs for fellow explorers.
                No followers, no feeds, no algorithm — just real-world adventure.
              </p>
            </AnimatedSection>

            {/* CTAs */}
            <AnimatedSection delay={300}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 group animate-pulse-glow"
                >
                  <Link to="/quests">
                    Explore Quests
                    <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-border hover:bg-muted"
                >
                  <Link to="/breadcrumbs">Learn About Breadcrumbs</Link>
                </Button>
              </div>
            </AnimatedSection>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
            <div className="w-1 h-3 bg-muted-foreground/50 rounded-full" />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28">
        <div className="container">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="font-poppins font-bold text-3xl md:text-4xl text-foreground mb-4">
                How It Works
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Four simple steps to start your adventure
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorksSteps.map((step, index) => (
              <StepCard
                key={step.title}
                step={index + 1}
                title={step.title}
                description={step.description}
                icon={step.icon}
                delay={index * 100}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Breadcrumbs Differentiator */}
      <section className="py-20 md:py-28 bg-muted/20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            <AnimatedSection direction="left">
              <div>
                <span className="text-primary font-semibold text-sm uppercase tracking-wide mb-4 block">
                  What Makes Us Different
                </span>
                <h2 className="font-poppins font-bold text-3xl md:text-4xl text-foreground mb-6">
                  Community Without Clout
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                  Breadcrumbs are the heart of SideQuests. They're short notes and photos
                  left by explorers for future visitors — real tips without the social media noise.
                </p>
                <Button asChild className="bg-turquoise hover:bg-turquoise/90 text-primary-foreground">
                  <Link to="/breadcrumbs">
                    Discover Breadcrumbs
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </AnimatedSection>

            <AnimatedSection direction="right">
              <div className="relative">
                <img
                  src={breadcrumbsMascot}
                  alt="Breadcrumbs Mascot"
                  className="w-full max-w-md mx-auto rounded-2xl shadow-2xl"
                />
                <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-turquoise/20 rounded-full blur-2xl" />
              </div>
            </AnimatedSection>
          </div>

          {/* DO / NOT comparison */}
          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard
              title="What Breadcrumbs ARE"
              items={breadcrumbsPositive}
              type="positive"
              delay={0}
            />
            <FeatureCard
              title="What Breadcrumbs are NOT"
              items={breadcrumbsNegative}
              type="negative"
              delay={100}
            />
          </div>
        </div>
      </section>

      {/* Sample Breadcrumbs */}
      <section className="py-20 md:py-28">
        <div className="container">
          <AnimatedSection>
            <div className="text-center mb-12">
              <h2 className="font-poppins font-bold text-3xl md:text-4xl text-foreground mb-4">
                Real Breadcrumbs from Explorers
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6">
            {sampleBreadcrumbs.map((breadcrumb, index) => (
              <BreadcrumbCard
                key={breadcrumb.author}
                {...breadcrumb}
                delay={index * 100}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Quests */}
      <section className="py-20 md:py-28 bg-muted/20">
        <div className="container">
          <AnimatedSection>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-12">
              <div>
                <h2 className="font-poppins font-bold text-3xl md:text-4xl text-foreground mb-2">
                  Featured Quests
                </h2>
                <p className="text-muted-foreground">Handpicked adventures for you</p>
              </div>
              <Button asChild variant="outline" className="border-border hover:bg-muted">
                <Link to="/quests">
                  View All Quests
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6">
            {featuredQuests.map((quest, index) => (
              <QuestCard key={quest.title} {...quest} delay={index * 100} />
            ))}
          </div>
        </div>
      </section>

      {/* Verticals Preview */}
      <section className="py-20 md:py-28">
        <div className="container">
          <AnimatedSection>
            <div className="text-center mb-12">
              <h2 className="font-poppins font-bold text-3xl md:text-4xl text-foreground mb-4">
                One Platform. Infinite Worlds.
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Explore quests across different categories tailored to your interests
              </p>
            </div>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {verticals.map((vertical, index) => (
              <VerticalCard key={vertical.title} {...vertical} delay={index * 80} />
            ))}
          </div>
        </div>
      </section>

      {/* For Hosts CTA */}
      <CTASection
        title="Become a Quest Host"
        description="Have a hidden gem you want to share? Create a quest and guide fellow explorers to discover something amazing."
        primaryAction={{ label: 'Get Started', href: '/hosts' }}
        secondaryAction={{ label: 'Learn More', href: '/partnerships' }}
        variant="coral"
      />
    </Layout>
  );
};

export default Index;