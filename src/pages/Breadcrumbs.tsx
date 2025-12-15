import { Link } from 'react-router-dom';
import { ArrowRight, Quote, Shield, Users, Sparkles, LucideIcon } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import AnimatedSection from '@/components/AnimatedSection';
import StepCard from '@/components/cards/StepCard';
import BreadcrumbCard from '@/components/cards/BreadcrumbCard';
import FeatureCard from '@/components/cards/FeatureCard';
import CTASection from '@/components/CTASection';
import { Button } from '@/components/ui/button';
import breadcrumbsMascot from '@/assets/breadcrumbs-mascot.jpg';
import { useLanguage } from '@/contexts/LanguageContext';

const stepIcons: LucideIcon[] = [Sparkles, Quote, Shield, Users];

const Breadcrumbs = () => {
  const { t } = useLanguage();

  const sampleBreadcrumbs = [
    {
      author: 'Explorer',
      location: 'Ritual Coffee Roasters',
      message: t.breadcrumbsPage.examples.items[0],
      image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&h=200&fit=crop',
    },
    {
      author: 'Wanderer',
      location: 'Clarion Alley',
      message: t.breadcrumbsPage.examples.items[1],
      image: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=400&h=200&fit=crop',
    },
    {
      author: 'Seeker',
      location: 'Lands End Trail',
      message: t.breadcrumbsPage.examples.items[2],
      image: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=400&h=200&fit=crop',
    },
    {
      author: 'Discoverer',
      location: 'Blue Bottle Coffee',
      message: t.breadcrumbsPage.examples.items[3] || t.breadcrumbsPage.examples.items[0],
    },
    {
      author: 'Navigator',
      location: 'Palace of Fine Arts',
      message: t.breadcrumbsPage.examples.items[4] || t.breadcrumbsPage.examples.items[1],
    },
    {
      author: 'Pathfinder',
      location: 'Dolores Park',
      message: t.breadcrumbsPage.examples.items[5] || t.breadcrumbsPage.examples.items[2],
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
                  {t.breadcrumbsPage.badge}
                </span>
                <h1 className="font-poppins font-bold text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 leading-tight">
                  {t.breadcrumbsPage.title}{' '}
                  <span className="text-gradient-turquoise">{t.breadcrumbsPage.titleHighlight}</span>
                </h1>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  {t.breadcrumbsPage.description}
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
                {t.breadcrumbsPage.sectionTitle}
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {t.breadcrumbsPage.sectionDescription}
              </p>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard
              title={t.breadcrumbsPage.whatTitle}
              items={t.breadcrumbsPage.whatItems}
              type="positive"
              delay={0}
            />
            <FeatureCard
              title={t.breadcrumbsPage.whatNotTitle}
              items={t.breadcrumbsPage.whatNotItems}
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
                {t.breadcrumbsPage.howItWorks.title}
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {t.breadcrumbsPage.howItWorks.subtitle}
              </p>
            </div>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.breadcrumbsPage.howItWorks.steps.map((step, index) => {
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

      {/* Sample Breadcrumbs */}
      <section className="py-20 md:py-28 bg-muted/20">
        <div className="container">
          <AnimatedSection>
            <div className="text-center mb-12">
              <h2 className="font-poppins font-bold text-3xl md:text-4xl text-foreground mb-4">
                {t.breadcrumbsPage.examples.title}
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {t.breadcrumbsPage.examples.subtitle}
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
        title={t.breadcrumbsPage.cta.title}
        description={t.breadcrumbsPage.cta.description}
        primaryAction={{ label: t.breadcrumbsPage.cta.button, href: '/quests' }}
        variant="turquoise"
      />
    </Layout>
  );
};

export default Breadcrumbs;
