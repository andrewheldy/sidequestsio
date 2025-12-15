import { Link } from 'react-router-dom';
import { Instagram, Twitter, Mail } from 'lucide-react';
import dotlingLogo from '@/assets/dotling-logo.jpg';
import AnimatedSection from '@/components/AnimatedSection';

const footerLinks = {
  explore: [
    { href: '/quests', label: 'Quests' },
    { href: '/breadcrumbs', label: 'Breadcrumbs' },
    { href: '/verticals', label: 'Verticals' },
  ],
  company: [
    { href: '/partnerships', label: 'Partnerships' },
    { href: '/hosts', label: 'For Hosts' },
  ],
  legal: [
    { href: '#', label: 'Privacy Policy' },
    { href: '#', label: 'Terms of Service' },
  ],
};

export function Footer() {
  return (
    <AnimatedSection>
      <footer className="bg-muted/30 border-t border-border/50 mt-auto">
        <div className="container py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-3 mb-4">
                <img
                  src={dotlingLogo}
                  alt="SideQuests.io Dotling"
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <span className="font-poppins font-bold text-lg text-foreground">
                  SideQuests<span className="text-primary">.io</span>
                </span>
              </Link>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                Privacy-first social discovery. Explore your city through community-driven quests.
              </p>
              <div className="flex gap-4">
                <a
                  href="#"
                  className="p-2 rounded-lg bg-muted/50 hover:bg-primary hover:text-primary-foreground transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  className="p-2 rounded-lg bg-muted/50 hover:bg-primary hover:text-primary-foreground transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  className="p-2 rounded-lg bg-muted/50 hover:bg-primary hover:text-primary-foreground transition-colors"
                  aria-label="Email"
                >
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Explore */}
            <div>
              <h4 className="font-poppins font-semibold text-foreground mb-4">Explore</h4>
              <ul className="space-y-3">
                {footerLinks.explore.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-poppins font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-poppins font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-border/50 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} SideQuests.io. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Made with ❤️ for explorers everywhere
            </p>
          </div>
        </div>
      </footer>
    </AnimatedSection>
  );
}

export default Footer;