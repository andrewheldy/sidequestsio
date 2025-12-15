import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import AnimatedSection from '@/components/AnimatedSection';

interface VerticalCardProps {
  title: string;
  description: string;
  icon: string;
  href: string;
  color?: 'coral' | 'turquoise' | 'sandstone';
  delay?: number;
  className?: string;
}

export function VerticalCard({
  title,
  description,
  icon,
  href,
  color = 'coral',
  delay = 0,
  className,
}: VerticalCardProps) {
  const colorClasses = {
    coral: 'bg-coral/10 text-coral group-hover:bg-coral group-hover:text-primary-foreground',
    turquoise: 'bg-turquoise/10 text-turquoise group-hover:bg-turquoise group-hover:text-primary-foreground',
    sandstone: 'bg-sandstone/10 text-sandstone group-hover:bg-sandstone group-hover:text-primary-foreground',
  };

  return (
    <AnimatedSection direction="scale" delay={delay}>
      <Link to={href} className="block">
        <div
          className={cn(
            'glass-card p-6 hover-lift group cursor-pointer h-full',
            className
          )}
        >
          {/* Icon */}
          <div
            className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center mb-4 text-3xl transition-colors duration-300',
              colorClasses[color]
            )}
          >
            {icon}
          </div>

          {/* Content */}
          <h3 className="font-poppins font-semibold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            {description}
          </p>

          {/* Arrow */}
          <div className="flex items-center gap-2 text-primary text-sm font-medium">
            <span>Explore</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </Link>
    </AnimatedSection>
  );
}

export default VerticalCard;