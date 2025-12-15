import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import dotlingLogo from '@/assets/dotling-logo.jpg';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { t } = useLanguage();

  const navLinks = [
    { href: '/quests', label: t.nav.quests },
    { href: '/breadcrumbs', label: t.nav.breadcrumbs },
    { href: '/verticals', label: t.nav.verticals },
    { href: '/partnerships', label: t.nav.partnerships },
    { href: '/hosts', label: t.nav.hosts },
  ];

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <>
      <header className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 py-3' : 'bg-transparent py-5'
      )}>
        <div className="container flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={dotlingLogo} alt="SideQuests.io" className="w-10 h-10 rounded-lg object-cover transition-transform duration-300 group-hover:scale-110" />
            <span className="font-poppins font-bold text-xl hidden sm:block">
              <span className="bg-gradient-to-r from-coral via-primary to-turquoise bg-clip-text text-transparent">SideQuests</span><span className="text-primary">.io</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href} className={cn(
                'px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200',
                location.pathname === link.href ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm">{t.nav.signIn}</Button>
            <Button size="sm">{t.nav.getStarted}</Button>
          </div>

          <div className="lg:hidden flex items-center gap-2">
            <LanguageSwitcher />
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-lg hover:bg-muted/50">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      <div className={cn('fixed inset-0 z-40 lg:hidden transition-all duration-300', isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')}>
        <div className="absolute inset-0 bg-background/95 backdrop-blur-xl" />
        <nav className="relative h-full flex flex-col items-center justify-center gap-6 p-8">
          {navLinks.map((link, index) => (
            <Link key={link.href} to={link.href} className={cn(
              'text-2xl font-poppins font-semibold transition-all duration-300',
              location.pathname === link.href ? 'text-primary' : 'text-foreground hover:text-primary'
            )} style={{ animationDelay: `${index * 50}ms` }}>
              {link.label}
            </Link>
          ))}
          <div className="flex flex-col gap-4 mt-8 w-full max-w-xs">
            <Button variant="outline" size="lg" className="w-full">{t.nav.signIn}</Button>
            <Button size="lg" className="w-full">{t.nav.getStarted}</Button>
          </div>
        </nav>
      </div>
    </>
  );
}

export default Header;
