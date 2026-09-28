import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Counts up to `target` once `active` (from 0 the first time, then from the
 * last shown value); jumps straight there under reduced motion.
 */
export function useCountUp(target: number, active: boolean, duration = 1400) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);
  const shown = useRef(0);
  useEffect(() => {
    if (!active) return;
    if (reduce) {
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
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration, reduce]);
  return value;
}
