import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import logoHorizontal from '../../../brand/logos/logo-horizontal.svg';

const navLinks = [
  { href: '/quests', label: 'Explore Miami' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/community-notes', label: 'Community Notes' },
  { href: '/partnerships', label: 'For partners' },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 h-[72px] border-b bg-background/96 backdrop-blur-xl',
          isScrolled ? 'border-border' : 'border-transparent',
        )}
      >
        <div className="sq-container flex h-full items-center justify-between gap-6">
          <Link to="/" className="inline-flex shrink-0 items-center" aria-label="sidequests home">
            <img src={logoHorizontal} alt="sidequests" className="h-auto w-[150px]" />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href.split('#')[0] && link.href !== '/';
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    'flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-card hover:text-foreground',
                    isActive && 'bg-card text-foreground',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/app/explore">Find a quest</Link>
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground hover:bg-card lg:hidden"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div id="mobile-navigation" className="fixed inset-x-0 bottom-0 top-[72px] z-40 bg-background lg:hidden">
          <nav className="sq-container flex h-full flex-col py-8" aria-label="Mobile navigation">
            <p className="sq-overline mb-4 text-muted-foreground">Choose a direction</p>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="flex min-h-[60px] items-center justify-between border-b border-border font-display text-2xl font-bold tracking-[-0.035em]"
              >
                {link.label}
                <span aria-hidden className="text-[hsl(var(--ocean-500))]">↗</span>
              </Link>
            ))}
            <div className="mt-auto grid gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <Button asChild size="lg"><Link to="/app/explore">Find a quest</Link></Button>
              <Button asChild variant="outline" size="lg"><Link to="/auth">Sign in</Link></Button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

export default Header;
