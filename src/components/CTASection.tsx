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
  variant?: 'coral' | 'turquoise';
  icon?: ReactNode;
  className?: string;
}

export function CTASection({
  title,
  description,
  primaryAction,
  secondaryAction,
  variant = 'coral',
  icon,
  className,
}: CTASectionProps) {
  return (
    <AnimatedSection>
      <section
        className={cn(
          'relative py-20 md:py-28 overflow-hidden',
          variant === 'coral'
            ? 'bg-gradient-to-br from-coral/20 via-coral/10 to-transparent'
            : 'bg-gradient-to-br from-turquoise/20 via-turquoise/10 to-transparent',
          className
        )}
      >
        {/* Background decoration */}
        <div
          className={cn(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-20',
            variant === 'coral' ? 'bg-coral' : 'bg-turquoise'
          )}
        />

        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            {icon && (
              <div className="mb-6 flex justify-center">
                {icon}
              </div>
            )}

            <h2 className="font-poppins font-bold text-3xl md:text-4xl lg:text-5xl text-foreground mb-6">
              {title}
            </h2>

            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              {description}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                className={cn(
                  'font-semibold px-8 group',
                  variant === 'coral'
                    ? 'bg-primary hover:bg-primary/90'
                    : 'bg-turquoise hover:bg-turquoise/90 text-primary-foreground'
                )}
              >
                <Link to={primaryAction.href}>
                  {primaryAction.label}
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>

              {secondaryAction && (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-border hover:bg-muted"
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