import { Link } from 'react-router-dom';
import { Instagram, Twitter, Mail } from 'lucide-react';
import dotlingLogo from '@/assets/dotling-logo.jpg';
import AnimatedSection from '@/components/AnimatedSection';
import ContactForm from '@/components/ContactForm';
import { useLanguage } from '@/contexts/LanguageContext';

export function Footer() {
  const { t } = useLanguage();

  return (
    <AnimatedSection>
      {/* Contact Section */}
      <section className="bg-gradient-to-b from-transparent to-muted/30 py-16">
        <div className="container">
          <div className="max-w-md mx-auto text-center">
            <h3 className="font-poppins font-bold text-xl text-foreground mb-2">{t.footer.newsletter.title}</h3>
            <p className="text-muted-foreground text-sm mb-6">{t.footer.description}</p>
            <ContactForm variant="compact" />
          </div>
        </div>
      </section>

      <footer className="bg-muted/30 border-t border-border/50">
        <div className="container py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-3 mb-4">
                <img src={dotlingLogo} alt="SideQuests.io" className="w-10 h-10 rounded-lg object-cover" />
                <span className="font-poppins font-bold text-lg text-foreground">SideQuests<span className="text-primary">.io</span></span>
              </Link>
              <p className="text-sm text-muted-foreground mb-4">{t.footer.description}</p>
              <div className="flex gap-3">
                <a href="#" className="p-2 rounded-lg bg-muted/50 hover:bg-primary hover:text-primary-foreground transition-colors"><Instagram className="w-4 h-4" /></a>
                <a href="#" className="p-2 rounded-lg bg-muted/50 hover:bg-primary hover:text-primary-foreground transition-colors"><Twitter className="w-4 h-4" /></a>
                <a href="#" className="p-2 rounded-lg bg-muted/50 hover:bg-primary hover:text-primary-foreground transition-colors"><Mail className="w-4 h-4" /></a>
              </div>
            </div>

            <div>
              <h4 className="font-poppins font-semibold text-foreground mb-4">{t.footer.explore}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/quests" className="text-muted-foreground hover:text-primary">{t.footer.links.quests}</Link></li>
                <li><Link to="/breadcrumbs" className="text-muted-foreground hover:text-primary">{t.footer.links.breadcrumbs}</Link></li>
                <li><Link to="/verticals" className="text-muted-foreground hover:text-primary">{t.footer.links.verticals}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-poppins font-semibold text-foreground mb-4">{t.footer.company}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/partnerships" className="text-muted-foreground hover:text-primary">{t.footer.links.partnerships}</Link></li>
                <li><Link to="/hosts" className="text-muted-foreground hover:text-primary">{t.footer.links.about}</Link></li>
                <li><Link to="#" className="text-muted-foreground hover:text-primary">{t.footer.links.contact}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-poppins font-semibold text-foreground mb-4">{t.footer.legal}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="#" className="text-muted-foreground hover:text-primary">{t.footer.links.privacy}</Link></li>
                <li><Link to="#" className="text-muted-foreground hover:text-primary">{t.footer.links.terms}</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border/50 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">{t.footer.copyright}</p>
            <p className="text-sm text-muted-foreground">{t.footer.tagline}</p>
          </div>
        </div>
      </footer>
    </AnimatedSection>
  );
}

export default Footer;
