import { Building, Users, MapPin, Megaphone, Heart } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import AnimatedSection from '@/components/AnimatedSection';
import StepCard from '@/components/cards/StepCard';
import CTASection from '@/components/CTASection';
import { cn } from '@/lib/utils';

const partnerTypes = [
  { icon: <Building className="w-8 h-8" />, title: 'Venues & Locations', description: 'Coffee shops, galleries, restaurants, and unique spaces.' },
  { icon: <Users className="w-8 h-8" />, title: 'Events & Festivals', description: 'Conferences, pop-ups, community gatherings.' },
  { icon: <MapPin className="w-8 h-8" />, title: 'Cities & Tourism', description: 'Destination marketing and local discovery initiatives.' },
  { icon: <Megaphone className="w-8 h-8" />, title: 'Brands & Sponsors', description: 'Authentic integration without intrusive advertising.' },
  { icon: <Heart className="w-8 h-8" />, title: 'Community Creators', description: 'Local experts and passionate explorers.' },
];

const benefits = [
  {
    icon: <Users className="w-7 h-7" />,
    title: 'IRL Engagement',
    description: 'Real foot traffic, not just impressions. People actually visit and experience your space.',
  },
  {
    icon: <Building className="w-7 h-7" />,
    title: 'Privacy-First Analytics',
    description: 'Understand engagement without invasive tracking. Aggregate insights, not individual data.',
  },
  {
    icon: <Heart className="w-7 h-7" />,
    title: 'Community Signal',
    description: 'Authentic recommendations from real explorers. No paid reviews, no influencer deals.',
  },
  {
    icon: <MapPin className="w-7 h-7" />,
    title: 'Discovery Network',
    description: 'Be part of a growing network of hidden gems that explorers actively seek out.',
  },
];

const Partnerships = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container">
          <AnimatedSection>
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-primary font-semibold text-sm uppercase tracking-wide mb-4 block">
                Partnerships
              </span>
              <h1 className="font-poppins font-bold text-4xl md:text-5xl text-foreground mb-6">
                Partner With <span className="text-gradient-coral">SideQuests</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Join a growing network of venues, brands, and communities that believe
                in authentic discovery over algorithmic promotion.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-16 md:py-24">
        <div className="container">
          <AnimatedSection>
            <h2 className="font-poppins font-bold text-2xl md:text-3xl text-foreground text-center mb-12">
              Who Partners With Us
            </h2>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {partnerTypes.map((type, index) => (
              <AnimatedSection key={type.title} delay={index * 80}>
                <div className="glass-card p-6 text-center hover-lift h-full">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    {type.icon}
                  </div>
                  <h3 className="font-poppins font-semibold text-foreground mb-2">{type.title}</h3>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-24 bg-muted/20">
        <div className="container">
          <AnimatedSection>
            <div className="text-center mb-12">
              <h2 className="font-poppins font-bold text-2xl md:text-3xl text-foreground mb-4">
                What Partners Get
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Real engagement, privacy-first insights, and authentic community connection
              </p>
            </div>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <StepCard
                key={benefit.title}
                step={index + 1}
                title={benefit.title}
                description={benefit.description}
                icon={benefit.icon}
                delay={index * 100}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24">
        <div className="container">
          <AnimatedSection>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-poppins font-bold text-2xl md:text-3xl text-foreground mb-6">
                How Partnership Works
              </h2>
              <p className="text-muted-foreground text-lg mb-10">
                We keep it simple. No complex contracts, no hidden fees.
              </p>

              <div className="space-y-8 text-left">
                {[
                  { step: '01', title: 'Reach Out', desc: 'Tell us about your venue, event, or brand. We\'ll schedule a quick call to understand your goals.' },
                  { step: '02', title: 'Create Your Quest', desc: 'We\'ll work with you to create an engaging quest that showcases what makes you special.' },
                  { step: '03', title: 'Launch & Grow', desc: 'Your quest goes live. Explorers discover you organically and leave breadcrumbs for others.' },
                  { step: '04', title: 'Track & Iterate', desc: 'See aggregate engagement data. Learn what resonates and refine your approach.' },
                ].map((item, index) => (
                  <AnimatedSection key={item.step} delay={index * 100}>
                    <div className="flex gap-6 items-start">
                      <span className="font-poppins font-bold text-3xl text-primary/30">{item.step}</span>
                      <div>
                        <h3 className="font-poppins font-semibold text-lg text-foreground mb-1">{item.title}</h3>
                        <p className="text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        title="Ready to Partner?"
        description="Let's create something meaningful together. Reach out and we'll schedule a conversation about how SideQuests can work for you."
        primaryAction={{ label: 'Start a Partnership', href: '#' }}
        variant="coral"
      />
    </Layout>
  );
};

export default Partnerships;