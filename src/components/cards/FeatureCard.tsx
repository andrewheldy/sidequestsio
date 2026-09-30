import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import AnimatedSection from '@/components/AnimatedSection';

interface FeatureCardProps {
  title: string;
  items: string[];
  type: 'positive' | 'negative';
  delay?: number;
  className?: string;
}

export function FeatureCard({ title, items, type, delay = 0, className }: FeatureCardProps) {
  const isPositive = type === 'positive';

  return (
    <AnimatedSection direction={isPositive ? 'left' : 'right'} delay={delay}>
      <div
        className={cn(
          'h-full rounded-2xl border border-border bg-card p-6 md:p-8',
          isPositive ? 'border-l-4 border-l-success' : 'border-l-4 border-l-destructive',
          className
        )}
      >
        <h3 className="mb-6 font-display text-xl font-bold tracking-[-0.02em] text-foreground">
          {title}
        </h3>

        <ul className="space-y-4">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                  isPositive ? 'bg-success/12 text-success' : 'bg-destructive/12 text-destructive'
                )}
              >
                {isPositive ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
              <span className="text-muted-foreground text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </AnimatedSection>
  );
}

export default FeatureCard;