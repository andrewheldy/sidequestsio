/** Small pieces shared by the /vice sections. */
import { ElementType, ReactNode, useEffect, useRef, useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { cn } from '@/lib/utils';
import type { Difficulty } from '@/types/db';
import type { MissionVerification } from '@/lib/campaigns/types';
import type { ResolvedMission } from '@/lib/campaigns/missions';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  legendary: 'Legendary',
};

export const VERIFICATION_LABEL: Record<MissionVerification, { title: string; detail: string }> = {
  gps: { title: 'Location check-in', detail: 'A one-time GPS check near the spot, verified on the server.' },
  photo: { title: 'Photo', detail: 'Capture your own photo of the moment.' },
  question: { title: 'Local question', detail: 'Answer a short question about where you are standing.' },
  records: { title: 'Mission records', detail: 'Unlocked by your completed missions.' },
};

export function statusLabel(item: ResolvedMission): string {
  if (item.status === 'completed') return 'Completed';
  if (item.status === 'previewed') return 'Previewed (demo)';
  if (item.status === 'locked') return `Locked · ${item.progress?.done ?? 0}/${item.progress?.total ?? 0}`;
  return item.mode === 'live' ? 'Available now' : 'Concept preview';
}

/** Public turn-by-turn link. Opens the visitor's own maps app; we send nothing ourselves. */
export function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** Adds `is-in` once scrolled into view; CSS drives the animation. */
export function Reveal({
  as: Tag = 'div',
  className,
  children,
  id,
  labelledBy,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  id?: string;
  labelledBy?: string;
}) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.12 });
  return (
    <Tag ref={ref} id={id} aria-labelledby={labelledBy} className={cn('vice-reveal', isVisible && 'is-in', className)}>
      {children}
    </Tag>
  );
}

export function SectionHead({ id, kicker, title, children }: { id: string; kicker: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="vice-head">
      <p className="vice-kicker">{kicker}</p>
      <h2 id={id} className="vice-h2">
        {title}
      </h2>
      {children && <div className="vice-lede">{children}</div>}
    </header>
  );
}

/** Eases toward `target` whenever it changes; jumps there under reduced motion. */
export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(target);
  const shown = useRef(target);
  useEffect(() => {
    if (shown.current === target) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shown.current = target;
      setValue(target);
      return;
    }
    let raf = 0;
    const from = shown.current;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      shown.current = from + (target - from) * (1 - Math.pow(1 - t, 3));
      setValue(shown.current);
      if (t < 1) raf = requestAnimationFrame(tick);
      else shown.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return Math.round(value);
}
