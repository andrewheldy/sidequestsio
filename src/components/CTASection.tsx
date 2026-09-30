import { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import AnimatedSection from '@/components/AnimatedSection';

interface CTASectionProps {
  title: string;
  description: string;
  primaryAction: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
  /**
   * `sand` is the warm editorial break between light sections; `navy` is the
   * full-strength branded moment. The previous coral/turquoise gradient washes
   * belonged to the old identity.
   */
  variant?: 'sand' | 'navy';
  icon?: ReactNode;
  className?: string;
}

export function CTASection({
  title,
  description,
  primaryAction,
  secondaryAction,
  variant = 'sand',
  icon,
  className,
}: CTASectionProps) {
  const isNavy = variant === 'navy';

  return (
    <AnimatedSection>
      <section
        className={cn(
          'relative overflow-hidden py-20 md:py-28',
          isNavy ? 'bg-navy text-sand-soft' : 'bg-sand text-foreground',
          className,
        )}
      >
        {/* A single doorway arch, echoing the mark without competing with the type. */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute left-1/2 top-0 h-[420px] w-[340px] -translate-x-1/2 rounded-t-full border-x border-t',
            isNavy ? 'border-white/10' : 'border-navy/10',
          )}
        />

        <div className="sq-container relative">
          <div className="mx-auto max-w-3xl text-center">
            {icon && <div className="mb-6 flex justify-center">{icon}</div>}

            <h2 className="sq-section-title mx-auto max-w-[16ch]">{title}</h2>

            <p
              className={cn(
                'mx-auto mt-6 max-w-2xl text-lg leading-relaxed',
                isNavy ? 'text-sand-soft/75' : 'text-muted-foreground',
              )}
            >
              {description}
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className={cn(
                  'group px-8 font-semibold',
                  isNavy && 'bg-reward text-reward-foreground hover:bg-sand',
                )}
              >
                <Link to={primaryAction.href}>
                  {primaryAction.label}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>

              {secondaryAction && (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className={cn(isNavy && 'border-white/25 text-white hover:border-white/45 hover:bg-white/10')}
                >
                  <Link to={secondaryAction.href}>{secondaryAction.label}</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}

export default CTASection;
