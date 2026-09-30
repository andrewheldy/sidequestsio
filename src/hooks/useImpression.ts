import { useEffect, useRef } from "react";

/**
 * Calls `onImpression` once, the first time the returned ref's element is at
 * least `threshold` visible. One shared IntersectionObserver per threshold
 * keeps many impression targets cheap; the observer disconnects from an
 * element as soon as it has fired. De-duplication across remounts is the
 * caller's job (see trackQuestEventOnce).
 */
export function useImpression<T extends Element>(
  onImpression: () => void,
  { threshold = 0.5, enabled = true }: { threshold?: number; enabled?: boolean } = {},
) {
  const ref = useRef<T>(null);
  const callback = useRef(onImpression);
  callback.current = onImpression;

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    if (typeof IntersectionObserver === "undefined") {
      callback.current();
      return;
    }
    return observe(el, threshold, () => callback.current());
  }, [enabled, threshold]);

  return ref;
}

const observers = new Map<number, { io: IntersectionObserver; handlers: Map<Element, () => void> }>();

function observe(el: Element, threshold: number, handler: () => void): () => void {
  let entry = observers.get(threshold);
  if (!entry) {
    const handlers = new Map<Element, () => void>();
    const io = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          // isIntersecting is true for any overlap; the ratio check enforces the
          // threshold (with slack for sub-pixel rounding).
          if (!record.isIntersecting || record.intersectionRatio < threshold - 0.01) continue;
          const fire = handlers.get(record.target);
          handlers.delete(record.target);
          io.unobserve(record.target);
          fire?.();
        }
      },
      { threshold },
    );
    entry = { io, handlers };
    observers.set(threshold, entry);
  }
  entry.handlers.set(el, handler);
  entry.io.observe(el);
  const { io, handlers } = entry;
  return () => {
    handlers.delete(el);
    io.unobserve(el);
  };
}
