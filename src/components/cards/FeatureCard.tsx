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
          'glass-card p-6 md:p-8 h-full',
          isPositive ? 'border-l-4 border-l-turquoise' : 'border-l-4 border-l-coral',
          className
        )}
      >
        <h3 className="font-poppins font-semibold text-xl text-foreground mb-6">
          {title}
        </h3>

        <ul className="space-y-4">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                  isPositive ? 'bg-turquoise/20 text-turquoise' : 'bg-coral/20 text-coral'
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