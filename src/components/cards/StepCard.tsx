import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import AnimatedSection from '@/components/AnimatedSection';

interface StepCardProps {
  step: number;
  title: string;
  description: string;
  icon: ReactNode;
  delay?: number;
  className?: string;
}

export function StepCard({ step, title, description, icon, delay = 0, className }: StepCardProps) {
  return (
    <AnimatedSection direction="scale" delay={delay}>
      <div
        className={cn(
          'glass-card p-6 md:p-8 hover-lift group relative overflow-hidden',
          className
        )}
      >
        {/* Step number */}
        <div className="absolute top-4 right-4 font-poppins font-bold text-6xl text-primary/10">
          {step.toString().padStart(2, '0')}
        </div>

        {/* Icon */}
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
          {icon}
        </div>

        {/* Content */}
        <h3 className="font-poppins font-semibold text-xl text-foreground mb-2">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </AnimatedSection>
  );
}

export default StepCard;