import { Link } from 'react-router-dom';
import { ArrowRight, Quote, Shield, Users, Sparkles, LucideIcon } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import AnimatedSection from '@/components/AnimatedSection';
import StepCard from '@/components/cards/StepCard';
import CommunityNoteCard from '@/components/cards/Community NoteCard';
import FeatureCard from '@/components/cards/FeatureCard';
import CTASection from '@/components/CTASection';
import { Button } from '@/components/ui/button';
import communityNotesMascot from '@/assets/community-notes-mascot.jpg';
import { useLanguage } from '@/contexts/LanguageContext';

const stepIcons: LucideIcon[] = [Sparkles, Quote, Shield, Users];

const CommunityNotes = () => {
  const { t } = useLanguage();

  const sampleCommunityNotes = [
    {
      author: 'Explorer',
      location: 'Panther Coffee Wynwood',
      message: t.communityNotesPage.examples.items[0],
      image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&h=200&fit=crop',
    },
    {
      author: 'Wanderer',
      location: 'Wynwood Walls',
      message: t.communityNotesPage.examples.items[1],
      image: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=400&h=200&fit=crop',
    },
    {
      author: 'Seeker',
      location: 'Bill Baggs Cape Florida',
      message: t.communityNotesPage.examples.items[2],
      image: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=400&h=200&fit=crop',
    },
    {
      author: 'Discoverer',
      location: 'All Day Coffee',
      message: t.communityNotesPage.examples.items[3] || t.communityNotesPage.examples.items[0],
    },
    {
      author: 'Navigator',
      location: 'Vizcaya Museum',
      message: t.communityNotesPage.examples.items[4] || t.communityNotesPage.examples.items[1],
    },
    {
      author: 'Pathfinder',
      location: 'Bayfront Park',
      message: t.communityNotesPage.examples.items[5] || t.communityNotesPage.examples.items[2],
    },
  ];

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
                  {t.communityNotesPage.badge}
                </span>
                <h1 className="font-poppins font-bold text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 leading-tight">
                  {t.communityNotesPage.title}{' '}
                  <span className="text-gradient-turquoise">{t.communityNotesPage.titleHighlight}</span>
                </h1>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  {t.communityNotesPage.description}
                </p>
                <Button
                  asChild
                  size="lg"
                  className="bg-turquoise hover:bg-turquoise/90 text-primary-foreground font-semibold"
                >
                  <Link to="/quests">
                    {t.home.hero.cta}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
              </div>
            </AnimatedSection>

            <AnimatedSection direction="right">
              <div className="relative">
                <img
                  src={communityNotesMascot}
                  alt="Community Notes Mascot"
                  className="w-full max-w-lg mx-auto rounded-3xl shadow-2xl"
                />
                <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-turquoise/20 rounded-full blur-2xl" />
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-coral/20 rounded-full blur-2xl" />
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* What Community Notes Are / Are Not */}
      <section className="py-20 md:py-28 bg-muted/20">
        <div className="container">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="font-poppins font-bold text-3xl md:text-4xl text-foreground mb-4">
                {t.communityNotesPage.sectionTitle}
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {t.communityNotesPage.sectionDescription}
              </p>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard
              title={t.communityNotesPage.whatTitle}
              items={t.communityNotesPage.whatItems}
              type="positive"
              delay={0}
            />
            <FeatureCard
              title={t.communityNotesPage.whatNotTitle}
              items={t.communityNotesPage.whatNotItems}
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
                {t.communityNotesPage.howItWorks.title}
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {t.communityNotesPage.howItWorks.subtitle}
              </p>
            </div>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.communityNotesPage.howItWorks.steps.map((step, index) => {
              const Icon = stepIcons[index] || Sparkles;
              return (
                <StepCard
                  key={step.title}
                  step={index + 1}
                  title={step.title}
                  description={step.description}
                  icon={<Icon className="w-7 h-7" />}
                  delay={index * 100}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Sample Community Notes */}
      <section className="py-20 md:py-28 bg-muted/20">
        <div className="container">
          <AnimatedSection>
            <div className="text-center mb-12">
              <h2 className="font-poppins font-bold text-3xl md:text-4xl text-foreground mb-4">
                {t.communityNotesPage.examples.title}
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {t.communityNotesPage.examples.subtitle}
              </p>
            </div>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sampleCommunityNotes.map((communityNote, index) => (
              <CommunityNoteCard key={`${communityNote.author}-${index}`} {...communityNote} delay={index * 80} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        title={t.communityNotesPage.cta.title}
        description={t.communityNotesPage.cta.description}
        primaryAction={{ label: t.communityNotesPage.cta.button, href: '/quests' }}
        variant="turquoise"
      />
    </Layout>
  );
};

export default CommunityNotes;
