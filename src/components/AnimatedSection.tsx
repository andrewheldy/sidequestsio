import { ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  direction?: 'up' | 'left' | 'right' | 'scale';
  delay?: number;
  threshold?: number;
}

export function AnimatedSection({
  children,
  className,
  direction = 'up',
  delay = 0,
  threshold = 0.1,
}: AnimatedSectionProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold });
  const [motionReady, setMotionReady] = useState(false);

  useEffect(() => {
    setMotionReady(true);
  }, []);

  const directionClasses = {
    up: 'reveal',
    left: 'reveal-left',
    right: 'reveal-right',
    scale: 'reveal-scale',
  };

  return (
    <div
      ref={ref}
      className={cn(
        directionClasses[direction],
        motionReady && 'motion-ready',
        isVisible && 'visible',
        className,
      )}
      style={{ transitionDelay: `${Math.min(delay, 160)}ms` }}
    >
      {children}
    </div>
  );
}

export default AnimatedSection;
