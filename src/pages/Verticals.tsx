import Layout from '@/components/layout/Layout';
import AnimatedSection from '@/components/AnimatedSection';
import VerticalCard from '@/components/cards/VerticalCard';
import CTASection from '@/components/CTASection';
import { useLanguage } from '@/contexts/LanguageContext';

const verticalKeys = ['coffee', 'art', 'music', 'outdoors', 'everyday', 'events'] as const;
const verticalIcons: Record<string, string> = {
  coffee: '☕',
  art: '🎨',
  music: '🎵',
  outdoors: '🏖️',
  everyday: '🚶',
  events: '🎪',
};
const verticalColors: Record<string, 'coral' | 'turquoise' | 'sandstone'> = {
  coffee: 'coral',
  art: 'turquoise',
  music: 'sandstone',
  outdoors: 'coral',
  everyday: 'turquoise',
  events: 'sandstone',
};

const Verticals = () => {
  const { t } = useLanguage();

  const verticals = verticalKeys.map((key) => ({
    title: t.verticals.categories[key].title,
    icon: verticalIcons[key],
    description: t.verticals.categories[key].description,
    href: `/verticals/${key}`,
    color: verticalColors[key],
  }));

  return (
    <Layout>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container">
          <AnimatedSection>
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="font-poppins font-bold text-4xl md:text-5xl text-foreground mb-6">
                {t.verticals.title}{' '}
                <span className="text-gradient-coral">{t.verticals.titleHighlight}</span>
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
        <div className="container">
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
        variant="coral"
      />
    </Layout>
  );
};

export default Verticals;
