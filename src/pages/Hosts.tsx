import { Lightbulb, Pencil, Rocket, BarChart3, Gift, Shield } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import AnimatedSection from '@/components/AnimatedSection';
import StepCard from '@/components/cards/StepCard';
import CTASection from '@/components/CTASection';

const launchSteps = [
  {
    icon: <Lightbulb className="w-7 h-7" />,
    title: 'Have an Idea',
    description: 'Know a hidden gem? A secret spot? Something that deserves to be discovered?',
  },
  {
    icon: <Pencil className="w-7 h-7" />,
    title: 'Create Your Quest',
    description: 'Describe the location, what makes it special, and any tips for explorers.',
  },
  {
    icon: <Rocket className="w-7 h-7" />,
    title: 'Launch & Share',
    description: 'Your quest goes live. Share it or let explorers discover it organically.',
  },
  {
    icon: <BarChart3 className="w-7 h-7" />,
    title: 'Track Engagement',
    description: 'See how many people complete your quest and what breadcrumbs they leave.',
  },
];

const benefits = [
  {
    icon: <Gift className="w-8 h-8" />,
    title: 'Free to Start',
    description: 'Creating and hosting quests is completely free. No hidden costs.',
  },
  {
    icon: <BarChart3 className="w-8 h-8" />,
    title: 'Simple Dashboard',
    description: 'Track completions, breadcrumbs, and engagement at a glance.',
  },
  {
    icon: <Shield className="w-8 h-8" />,
    title: 'Privacy-First',
    description: 'You see aggregate data, never individual user information.',
  },
];

const Hosts = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container">
          <AnimatedSection>
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-turquoise font-semibold text-sm uppercase tracking-wide mb-4 block">
                For Hosts
              </span>
              <h1 className="font-poppins font-bold text-4xl md:text-5xl text-foreground mb-6">
                Share Your Hidden <span className="text-gradient-turquoise">Gems</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Know a spot that deserves to be discovered? Create a quest and guide
                fellow explorers to experiences they'll never forget.
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
              How to Launch Your Quest
            </h2>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {launchSteps.map((step, index) => (
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

      {/* Dashboard Preview */}
      <section className="py-16 md:py-24 bg-muted/20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection direction="left">
              <div>
                <span className="text-primary font-semibold text-sm uppercase tracking-wide mb-4 block">
                  Your Dashboard
                </span>
                <h2 className="font-poppins font-bold text-2xl md:text-3xl text-foreground mb-6">
                  Everything You Need, Nothing You Don't
                </h2>
                <p className="text-muted-foreground text-lg mb-8">
                  Our host dashboard is designed to be simple and actionable. See your quest performance
                  at a glance, read breadcrumbs left by visitors, and understand what resonates.
                </p>

                <ul className="space-y-4">
                  {['Quest completion stats', 'Breadcrumb feed', 'Engagement trends', 'Simple editing tools'].map((item, index) => (
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
                  <h3 className="font-poppins font-semibold text-lg text-foreground">Your Quests</h3>
                  <span className="text-sm text-muted-foreground">Last 30 days</span>
                </div>

                {/* Mock stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Completions', value: '127' },
                    { label: 'Breadcrumbs', value: '43' },
                    { label: 'Views', value: '892' },
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
                      <span className="text-sm text-muted-foreground">{quest.completions} completions</span>
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
              Why Host on SideQuests
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <AnimatedSection key={benefit.title} delay={index * 100}>
                <div className="glass-card p-8 text-center hover-lift h-full">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-turquoise/10 flex items-center justify-center text-turquoise">
                    {benefit.icon}
                  </div>
                  <h3 className="font-poppins font-semibold text-xl text-foreground mb-3">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        title="Ready to Create Your First Quest?"
        description="Share your hidden gems with the world. It only takes a few minutes to create a quest that could inspire thousands of explorers."
        primaryAction={{ label: 'Get Started as a Host', href: '#' }}
        variant="turquoise"
      />
    </Layout>
  );
};

export default Hosts;