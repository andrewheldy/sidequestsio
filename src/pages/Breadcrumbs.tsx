import { Link } from 'react-router-dom';
import { ArrowRight, Quote, Shield, Users, Sparkles } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import AnimatedSection from '@/components/AnimatedSection';
import StepCard from '@/components/cards/StepCard';
import BreadcrumbCard from '@/components/cards/BreadcrumbCard';
import FeatureCard from '@/components/cards/FeatureCard';
import CTASection from '@/components/CTASection';
import { Button } from '@/components/ui/button';
import breadcrumbsMascot from '@/assets/breadcrumbs-mascot.jpg';

const whatBreadcrumbsAre = [
  'Short notes and photos left at quest locations',
  'Real tips from explorers who\'ve been there',
  'Anonymous and privacy-first by design',
  'Community signal, not personal branding',
  'A way to help the next visitor',
];

const whatBreadcrumbsAreNot = [
  'No followers, no feeds, no algorithm',
  'No likes, comments, or engagement metrics',
  'No personal profiles or social graphs',
  'No influencer culture or clout chasing',
  'No data harvesting or targeted ads',
];

const howItWorks = [
  {
    icon: <Sparkles className="w-7 h-7" />,
    title: 'Complete a Quest',
    description: 'Visit a location and check in to complete your quest. The experience is yours.',
  },
  {
    icon: <Quote className="w-7 h-7" />,
    title: 'Leave Your Note',
    description: 'Share a quick tip, observation, or photo. What would help the next explorer?',
  },
  {
    icon: <Shield className="w-7 h-7" />,
    title: 'Stay Anonymous',
    description: 'Your breadcrumb is attached to the location, not your identity. Privacy by design.',
  },
  {
    icon: <Users className="w-7 h-7" />,
    title: 'Help Others Discover',
    description: 'Future visitors see your breadcrumb and benefit from your experience.',
  },
];

const sampleBreadcrumbs = [
  {
    author: 'Explorer',
    location: 'Ritual Coffee Roasters',
    message: 'The back patio is the real gem here. Ask about their single-origin Ethiopian — life changing.',
    image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&h=200&fit=crop',
  },
  {
    author: 'Wanderer',
    location: 'Clarion Alley',
    message: 'Come early morning for the best photos. The light hits the murals perfectly around 8am.',
    image: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=400&h=200&fit=crop',
  },
  {
    author: 'Seeker',
    location: 'Lands End Trail',
    message: 'Take the left fork at the second junction. There\'s a hidden bench with the best view.',
    image: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=400&h=200&fit=crop',
  },
  {
    author: 'Discoverer',
    location: 'Blue Bottle Coffee',
    message: 'The Gibraltar is their secret menu item. Trust me on this one.',
  },
  {
    author: 'Navigator',
    location: 'Palace of Fine Arts',
    message: 'Bring breadcrumbs (real ones) for the ducks. They\'re very friendly in the morning.',
  },
  {
    author: 'Pathfinder',
    location: 'Dolores Park',
    message: 'The southwest corner has the best city views. Arrive 30 min before sunset.',
  },
];

const Breadcrumbs = () => {
  return (
    <Layout>
      {/* Hero with Mascot */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-turquoise/10 rounded-full blur-3xl" />

        <div className="container relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection direction="left">
              <div>
                <span className="text-turquoise font-semibold text-sm uppercase tracking-wide mb-4 block">
                  The Heart of SideQuests
                </span>
                <h1 className="font-poppins font-bold text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 leading-tight">
                  Leave a Trail,{' '}
                  <span className="text-gradient-turquoise">Help Others Find</span>
                </h1>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Breadcrumbs are short notes and photos left by explorers at quest locations.
                  They're anonymous, helpful, and completely free from social media dynamics.
                </p>
                <Button
                  asChild
                  size="lg"
                  className="bg-turquoise hover:bg-turquoise/90 text-primary-foreground font-semibold"
                >
                  <Link to="/quests">
                    Start Exploring
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
              </div>
            </AnimatedSection>

            <AnimatedSection direction="right">
              <div className="relative">
                <img
                  src={breadcrumbsMascot}
                  alt="Breadcrumbs Mascot"
                  className="w-full max-w-lg mx-auto rounded-3xl shadow-2xl"
                />
                <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-turquoise/20 rounded-full blur-2xl" />
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-coral/20 rounded-full blur-2xl" />
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* What Breadcrumbs Are / Are Not */}
      <section className="py-20 md:py-28 bg-muted/20">
        <div className="container">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="font-poppins font-bold text-3xl md:text-4xl text-foreground mb-4">
                Community Without the Noise
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                We built breadcrumbs as an antidote to social media. Here's what makes them different.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard
              title="What Breadcrumbs ARE"
              items={whatBreadcrumbsAre}
              type="positive"
              delay={0}
            />
            <FeatureCard
              title="What Breadcrumbs are NOT"
              items={whatBreadcrumbsAreNot}
              type="negative"
              delay={100}
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28">
        <div className="container">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="font-poppins font-bold text-3xl md:text-4xl text-foreground mb-4">
                How Breadcrumbs Work
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Simple, anonymous, and focused on helping others
              </p>
            </div>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step, index) => (
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

      {/* Sample Breadcrumbs */}
      <section className="py-20 md:py-28 bg-muted/20">
        <div className="container">
          <AnimatedSection>
            <div className="text-center mb-12">
              <h2 className="font-poppins font-bold text-3xl md:text-4xl text-foreground mb-4">
                Real Breadcrumbs from the Community
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                These are the kinds of notes explorers leave for each other
              </p>
            </div>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sampleBreadcrumbs.map((breadcrumb, index) => (
              <BreadcrumbCard key={`${breadcrumb.author}-${index}`} {...breadcrumb} delay={index * 80} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        title="Start Leaving Breadcrumbs"
        description="Complete your first quest and leave a note for the next explorer. Your insights help build a community of discovery."
        primaryAction={{ label: 'Find a Quest', href: '/quests' }}
        variant="turquoise"
      />
    </Layout>
  );
};

export default Breadcrumbs;