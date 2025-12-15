import { Building, Users, MapPin, Megaphone, Heart } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import AnimatedSection from '@/components/AnimatedSection';
import StepCard from '@/components/cards/StepCard';
import ContactForm from '@/components/ContactForm';
import { useLanguage } from '@/contexts/LanguageContext';

const Partnerships = () => {
  const { t } = useLanguage();

  const partnerTypes = [
    { icon: <Building className="w-8 h-8" />, ...t.partnerships.types.venues },
    { icon: <Users className="w-8 h-8" />, ...t.partnerships.types.events },
    { icon: <MapPin className="w-8 h-8" />, ...t.partnerships.types.cities },
    { icon: <Megaphone className="w-8 h-8" />, ...t.partnerships.types.brands },
    { icon: <Heart className="w-8 h-8" />, ...t.partnerships.types.creators },
  ];

  const benefitIcons = [<Users className="w-7 h-7" />, <Building className="w-7 h-7" />, <Heart className="w-7 h-7" />, <MapPin className="w-7 h-7" />];

  return (
    <Layout>
      <section className="py-16 md:py-24 bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container">
          <AnimatedSection>
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-primary font-semibold text-sm uppercase tracking-wide mb-4 block">{t.partnerships.badge}</span>
              <h1 className="font-poppins font-bold text-4xl md:text-5xl text-foreground mb-6">
                {t.partnerships.title} <span className="text-gradient-coral">{t.partnerships.titleHighlight}</span>
              </h1>
              <p className="text-lg text-muted-foreground">{t.partnerships.description}</p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container">
          <AnimatedSection><h2 className="font-poppins font-bold text-2xl md:text-3xl text-foreground text-center mb-12">{t.partnerships.whoTitle}</h2></AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {partnerTypes.map((type, index) => (
              <AnimatedSection key={type.title} delay={index * 80}>
                <div className="glass-card p-6 text-center hover-lift h-full">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center text-primary">{type.icon}</div>
                  <h3 className="font-poppins font-semibold text-foreground mb-2">{type.title}</h3>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-muted/20">
        <div className="container">
          <AnimatedSection>
            <div className="text-center mb-12">
              <h2 className="font-poppins font-bold text-2xl md:text-3xl text-foreground mb-4">{t.partnerships.benefits.title}</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t.partnerships.benefits.subtitle}</p>
            </div>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.partnerships.benefits.items.map((benefit, index) => (
              <StepCard key={benefit.title} step={index + 1} title={benefit.title} description={benefit.description} icon={benefitIcons[index]} delay={index * 100} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container">
          <AnimatedSection>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-poppins font-bold text-2xl md:text-3xl text-foreground mb-6">{t.partnerships.howItWorks.title}</h2>
              <p className="text-muted-foreground text-lg mb-10">{t.partnerships.howItWorks.subtitle}</p>
              <div className="space-y-8 text-left">
                {t.partnerships.howItWorks.steps.map((item, index) => (
                  <AnimatedSection key={item.step} delay={index * 100}>
                    <div className="flex gap-6 items-start">
                      <span className="font-poppins font-bold text-3xl text-primary/30">{item.step}</span>
                      <div>
                        <h3 className="font-poppins font-semibold text-lg text-foreground mb-1">{item.title}</h3>
                        <p className="text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <AnimatedSection>
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="font-poppins font-bold text-2xl md:text-3xl text-foreground mb-4">{t.partnerships.contact.title}</h2>
                <p className="text-muted-foreground">{t.partnerships.contact.description}</p>
              </div>
              <div className="glass-card p-8">
                <ContactForm variant="full" />
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </Layout>
  );
};

export default Partnerships;
