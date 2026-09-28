/**
 * Small components shared across the /iiipoints sections: scroll reveal and
 * section headings. Geometry lives in geometry.ts, the count-up in useCountUp.ts.
 */
import { ElementType, ReactNode } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { cn } from '@/lib/utils';

/** Adds `is-in` once the element scrolls into view; CSS drives the animation. */
export function Reveal({
  as: Tag = 'div',
  className,
  children,
  id,
  threshold = 0.18,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  id?: string;
  threshold?: number;
}) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold });
  return (
    <Tag ref={ref} id={id} className={cn('iii-reveal', isVisible && 'is-in', className)}>
      {children}
    </Tag>
  );
}

export function SectionHead({
  kicker,
  title,
  children,
  tone = 'ink',
}: {
  kicker: string;
  title: ReactNode;
  children?: ReactNode;
  tone?: 'ink' | 'paper';
}) {
  return (
    <header className={cn('iii-head', tone === 'paper' && 'iii-head--paper')}>
      <p className="iii-kicker">
        <span className="iii-kicker__node" aria-hidden="true" />
        {kicker}
      </p>
      <h2 className="iii-h2">{title}</h2>
      {children && <div className="iii-head__lede">{children}</div>}
    </header>
  );
}
