import { Lightbulb, Pencil, Rocket, BarChart3, Gift, Shield } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import AnimatedSection from '@/components/AnimatedSection';
import StepCard from '@/components/cards/StepCard';
import CTASection from '@/components/CTASection';
import { useLanguage } from '@/contexts/LanguageContext';

const stepIcons = [Lightbulb, Pencil, Rocket, BarChart3];
const benefitIcons = [Gift, BarChart3, Shield];

const Hosts = () => {
  const { t } = useLanguage();

  return (
    <Layout>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container">
          <AnimatedSection>
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-turquoise font-semibold text-sm uppercase tracking-wide mb-4 block">
                {t.hosts.badge}
              </span>
              <h1 className="font-poppins font-bold text-4xl md:text-5xl text-foreground mb-6">
                {t.hosts.title} <span className="text-gradient-turquoise">{t.hosts.titleHighlight}</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                {t.hosts.description}
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24">
        <div className="container">
          <AnimatedSection>
            <h2 className="font-poppins font-bold text-2xl md:text-3xl text-foreground text-center mb-12">
              {t.hosts.howTo.title}
            </h2>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.hosts.howTo.steps.map((step, index) => {
              const Icon = stepIcons[index] || Lightbulb;
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

      {/* Dashboard Preview */}
      <section className="py-16 md:py-24 bg-muted/20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection direction="left">
              <div>
                <span className="text-primary font-semibold text-sm uppercase tracking-wide mb-4 block">
                  {t.hosts.dashboard.title}
                </span>
                <h2 className="font-poppins font-bold text-2xl md:text-3xl text-foreground mb-6">
                  {t.hosts.dashboard.subtitle}
                </h2>
                <p className="text-muted-foreground text-lg mb-8">
                  {t.hosts.dashboard.description}
                </p>

                <ul className="space-y-4">
                  {t.hosts.dashboard.features.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-foreground">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedSection>

            <AnimatedSection direction="right">
              <div className="glass-card p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-poppins font-semibold text-lg text-foreground">{t.hosts.dashboard.yourQuests}</h3>
                  <span className="text-sm text-muted-foreground">{t.hosts.dashboard.last30Days}</span>
                </div>

                {/* Mock stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: t.hosts.dashboard.stats.completions, value: '127' },
                    { label: t.hosts.dashboard.stats.breadcrumbs, value: '43' },
                    { label: t.hosts.dashboard.stats.views, value: '892' },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center p-4 bg-muted/30 rounded-xl">
                      <p className="font-poppins font-bold text-2xl text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Mock quest list */}
                <div className="space-y-3">
                  {[
                    { name: 'Hidden Rooftop Coffee', completions: 78 },
                    { name: 'Secret Garden Café', completions: 49 },
                  ].map((quest) => (
                    <div key={quest.name} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <span className="text-sm text-foreground">{quest.name}</span>
                      <span className="text-sm text-muted-foreground">{quest.completions} {t.hosts.dashboard.completionsLabel}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-24">
        <div className="container">
          <AnimatedSection>
            <h2 className="font-poppins font-bold text-2xl md:text-3xl text-foreground text-center mb-12">
              {t.hosts.benefits.title}
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6">
            {t.hosts.benefits.items.map((benefit, index) => {
              const Icon = benefitIcons[index] || Gift;
              return (
                <AnimatedSection key={benefit.title} delay={index * 100}>
                  <div className="glass-card p-8 text-center hover-lift h-full">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-turquoise/10 flex items-center justify-center text-turquoise">
                      <Icon className="w-8 h-8" />
                    </div>
                    <h3 className="font-poppins font-semibold text-xl text-foreground mb-3">{benefit.title}</h3>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        title={t.hosts.cta.title}
        description={t.hosts.cta.description}
        primaryAction={{ label: t.hosts.cta.button, href: '#' }}
        variant="turquoise"
      />
    </Layout>
  );
};

export default Hosts;
