import { Link } from 'react-router-dom';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import AnimatedSection from '@/components/AnimatedSection';

interface VerticalCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  delay?: number;
  className?: string;
}

/**
 * Editorial entry card for a quest category.
 *
 * Every card shares one treatment — a Midnight Navy doorway tile holding the
 * category glyph — rather than the per-card accent colour the old identity
 * used. The category is told by the glyph and the title; colour stays restrained.
 */
export function VerticalCard({
  title,
  description,
  icon: Icon,
  href,
  delay = 0,
  className,
}: VerticalCardProps) {
  return (
    <AnimatedSection direction="scale" delay={delay}>
      <Link
        to={href}
        className={cn(
          'quest-card group flex h-full flex-col rounded-2xl border border-border bg-card p-6',
          className,
        )}
      >
        {/* Doorway tile: arched top, square base — the mark's silhouette. */}
        <span
          aria-hidden
          className="mb-5 flex h-14 w-12 items-end justify-center rounded-t-[1.5rem] rounded-b-md bg-navy pb-3 text-reward"
        >
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </span>

        <h3 className="font-display text-lg font-bold tracking-[-0.02em] text-foreground">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>

        <span className="mt-5 flex items-center gap-2 pt-1 text-sm font-semibold text-ocean-strong">
          Explore
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </Link>
    </AnimatedSection>
  );
}

export default VerticalCard;
