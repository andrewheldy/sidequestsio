import { Link } from 'react-router-dom';
import { ArrowRight, Search, MapPin, BookOpen, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Layout from '@/components/layout/Layout';
import AnimatedSection from '@/components/AnimatedSection';
import StepCard from '@/components/cards/StepCard';
import QuestCard from '@/components/cards/QuestCard';
import CommunityNoteCard from '@/components/cards/CommunityNoteCard';
import VerticalCard from '@/components/cards/VerticalCard';
import FeatureCard from '@/components/cards/FeatureCard';
import CTASection from '@/components/CTASection';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRotatingTagline } from '@/hooks/useRotatingTagline';
import dotlingLogo from '@/assets/dotling-logo.jpg';
import communityNotesMascot from '@/assets/community-notes-mascot.jpg';

const featuredQuests = [
  {
    questId: 'quest-wynwood',
    title: 'Wynwood Walls',
    location: 'Wynwood, Miami',
    category: 'Culture',
    concept: "Say 'I feel seen' in front of your favorite mural — with complete sincerity.",
    xp: 130,
    physicalReward: 'Gallery Print',
    image: 'https://images.unsplash.com/photo-1569700296499-d5671c74cb3d?w=400&h=300&fit=crop',
  },
  {
    questId: 'quest-panther',
    title: 'Panther Coffee: Single-Origin Ritual',
    location: 'Wynwood, Miami',
    category: 'Foodie',
    concept: "Describe the coffee using only geography — then ask for the passphrase.",
    xp: 100,
    physicalReward: 'Free single-origin pour-over',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop',
  },
  {
    questId: 'quest-brickell-key',
    title: 'Brickell Key: The Skyline Claim',
    location: 'Brickell, Miami',
    category: 'Outdoor',
    concept: "Point at the Miami skyline and say 'that's mine' with full conviction.",
    xp: 115,
    physicalReward: 'Skyline photo print',
    image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=300&fit=crop',
  },
];

const sampleCommunityNotes = [
  {
    author: 'Maya',
    location: 'Panther Coffee Wynwood',
    message: 'The back patio is the real gem here. Ask about their single-origin Ethiopian — life changing.',
    image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&h=200&fit=crop',
  },
  {
    author: 'James',
    location: 'Wynwood Walls',
    message: 'Come early morning for the best photos. The light hits the murals perfectly around 8am.',
  },
  {
    author: 'Sofia',
    location: 'South Pointe Park',
    message: 'Take the path along the jetty. There\'s a hidden bench with the best view of the skyline.',
  },
];

const Index = () => {
  const { t } = useLanguage();
  
  const { heroRef, currentTagline, isExiting, ctaPulse, prefersReducedMotion } = useRotatingTagline(
    t.home.hero.taglines
  );

  const howItWorksSteps = [
    { icon: <Search className="w-7 h-7" />, ...t.home.howItWorks.steps[0] },
    { icon: <MapPin className="w-7 h-7" />, ...t.home.howItWorks.steps[1] },
    { icon: <Compass className="w-7 h-7" />, ...t.home.howItWorks.steps[2] },
    { icon: <BookOpen className="w-7 h-7" />, ...t.home.howItWorks.steps[3] },
  ];

  const verticals = [
    { title: t.verticals.categories.coffee.title, icon: '☕', description: t.verticals.categories.coffee.description, href: '/verticals/coffee', color: 'coral' as const },
    { title: t.verticals.categories.art.title, icon: '🎨', description: t.verticals.categories.art.description, href: '/verticals/art', color: 'turquoise' as const },
    { title: t.verticals.categories.music.title, icon: '🎵', description: t.verticals.categories.music.description, href: '/verticals/music', color: 'sandstone' as const },
    { title: t.verticals.categories.outdoors.title, icon: '🏖️', description: t.verticals.categories.outdoors.description, href: '/verticals/outdoors', color: 'coral' as const },
    { title: t.verticals.categories.everyday.title, icon: '🚶', description: t.verticals.categories.everyday.description, href: '/verticals/everyday', color: 'turquoise' as const },
    { title: t.verticals.categories.events.title, icon: '🎪', description: t.verticals.categories.events.description, href: '/verticals/events', color: 'sandstone' as const },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo via-indigo-light to-background" />
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-coral/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-turquoise/10 rounded-full blur-3xl" />

        <div className="container relative z-10 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <AnimatedSection delay={0}>
              <div className="inline-flex items-center gap-3 bg-muted/30 backdrop-blur-sm border border-border/50 rounded-full px-4 py-2 mb-8">
                <img src={dotlingLogo} alt="Dotling" className="w-8 h-8 rounded-full object-cover" />
                <span className="text-sm text-muted-foreground">Privacy-first social discovery</span>
              </div>
            </AnimatedSection>

            {/* Rotating Headline */}
            <AnimatedSection delay={100}>
              <div className="min-h-[120px] md:min-h-[160px] flex items-center justify-center mb-6">
              <h1 
                  className={`font-poppins font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight bg-gradient-to-r from-coral via-foreground to-turquoise bg-clip-text text-transparent ${
                    prefersReducedMotion ? '' : isExiting ? 'tagline-exit' : 'tagline-enter'
                  }`}
                >
                  {currentTagline.main}
                </h1>
              </div>
            </AnimatedSection>

            {/* Rotating Subheadline */}
            <AnimatedSection delay={200}>
              <div className="min-h-[60px] md:min-h-[80px] flex items-center justify-center mb-10">
                <p 
                  className={`text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed ${
                    prefersReducedMotion ? '' : isExiting ? 'subheadline-exit' : 'subheadline-enter'
                  }`}
                >
                  {currentTagline.sub}
                </p>
              </div>
            </AnimatedSection>

            {/* CTAs */}
            <AnimatedSection delay={300}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className={`bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 group ${ctaPulse ? 'cta-pulse' : ''}`}
                >
                  <Link to="/quests">
                    Start Exploring
                    <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-border hover:bg-muted">
                  <Link to="/app/explore">Take the Tour</Link>
                </Button>
              </div>
            </AnimatedSection>
          </div>
        </div>

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
                {t.home.howItWorks.title}
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {t.home.howItWorks.subtitle}
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorksSteps.map((step, index) => (
              <StepCard key={index} step={index + 1} title={step.title} description={step.description} icon={step.icon} delay={index * 100} />
            ))}
          </div>
        </div>
      </section>

      {/* Community Notes Differentiator */}
      <section className="py-20 md:py-28 bg-muted/20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            <AnimatedSection direction="left">
              <div>
                <span className="text-primary font-semibold text-sm uppercase tracking-wide mb-4 block">
                  {t.home.communityNotes.badge}
                </span>
                <h2 className="font-poppins font-bold text-3xl md:text-4xl text-foreground mb-6">
                  {t.home.communityNotes.title}
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                  {t.home.communityNotes.description}
                </p>
                <Button asChild className="bg-turquoise hover:bg-turquoise/90 text-primary-foreground">
                  <Link to="/community-notes">
                    {t.common.learnMore}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </AnimatedSection>

            <AnimatedSection direction="right">
              <div className="relative">
                <img src={communityNotesMascot} alt="Community Notes Mascot" className="w-full max-w-md mx-auto rounded-2xl shadow-2xl" />
                <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-turquoise/20 rounded-full blur-2xl" />
              </div>
            </AnimatedSection>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard title={t.home.communityNotes.whatTheyAre} items={t.home.communityNotes.areList} type="positive" delay={0} />
            <FeatureCard title={t.home.communityNotes.whatTheyAreNot} items={t.home.communityNotes.areNotList} type="negative" delay={100} />
          </div>
        </div>
      </section>

      {/* Sample Community Notes */}
      <section className="py-20 md:py-28">
        <div className="container">
          <AnimatedSection>
            <div className="text-center mb-12">
              <h2 className="font-poppins font-bold text-3xl md:text-4xl text-foreground mb-4">
                {t.communityNotesPage.examples.title}
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6">
            {sampleCommunityNotes.map((communityNote, index) => (
              <CommunityNoteCard key={communityNote.author} {...communityNote} delay={index * 100} />
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
                  {t.home.quests.title}
                </h2>
                <p className="text-muted-foreground">{t.home.quests.badge}</p>
              </div>
              <Button asChild variant="outline" className="border-border hover:bg-muted">
                <Link to="/quests">
                  {t.home.quests.viewAll}
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
                {t.verticals.title} <span className="text-gradient-coral">{t.verticals.titleHighlight}</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {t.verticals.description}
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
        title={t.home.hosts.title}
        description={t.home.hosts.description}
        primaryAction={{ label: t.home.hosts.cta, href: '/hosts' }}
        secondaryAction={{ label: t.common.learnMore, href: '/partnerships' }}
        variant="coral"
      />
    </Layout>
  );
};

export default Index;