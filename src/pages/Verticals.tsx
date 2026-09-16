import { Coffee, Footprints, PartyPopper, Palette, Music, Trees } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import AnimatedSection from '@/components/AnimatedSection';
import VerticalCard from '@/components/cards/VerticalCard';
import CTASection from '@/components/CTASection';
import { useLanguage } from '@/contexts/LanguageContext';

const verticalKeys = ['coffee', 'art', 'music', 'outdoors', 'everyday', 'events'] as const;
// Proper UI icons, matching the lucide set the rest of the app draws from.
const verticalIcons = {
  coffee: Coffee,
  art: Palette,
  music: Music,
  outdoors: Trees,
  everyday: Footprints,
  events: PartyPopper,
} as const;

const Verticals = () => {
  const { t } = useLanguage();

  const verticals = verticalKeys.map((key) => ({
    title: t.verticals.categories[key].title,
    icon: verticalIcons[key],
    description: t.verticals.categories[key].description,
    href: `/verticals/${key}`,
  }));

  return (
    <Layout>
      {/* Hero */}
      <section className="border-b border-border bg-sand py-16 md:py-24">
        <div className="sq-container">
          <AnimatedSection>
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="sq-section-title mb-6">
                {t.verticals.title}{' '}
                <span className="text-ocean-strong">{t.verticals.titleHighlight}</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                {t.verticals.description}
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Verticals Grid */}
      <section className="py-12 md:py-20">
        <div className="sq-container">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {verticals.map((vertical, index) => (
              <VerticalCard key={vertical.href} {...vertical} delay={index * 100} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        title={t.verticals.cta.title}
        description={t.verticals.cta.description}
        primaryAction={{ label: t.verticals.cta.button, href: '/partnerships' }}
        variant="sand"
      />
    </Layout>
  );
};

export default Verticals;
