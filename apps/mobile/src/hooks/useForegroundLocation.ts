import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getCurrent, getLastKnown, watch } from '../lib/location/adapter';
import { assessSample, shouldRequery } from '../lib/location/quality';
import type { LocationSample, SampleQuality } from '../lib/location/types';

export type ForegroundLocation =
  | { status: 'idle' }
  | { status: 'locating'; sample: LocationSample | null }
  | { status: 'ready'; sample: LocationSample; quality: SampleQuality }
  | { status: 'unavailable' };

/**
 * Device location while a location-dependent screen is active: a recent
 * last-known fix first (labelled stale if old), then a bounded fresh fix, then
 * a watch that only re-queries after meaningful movement. Stops whenever the
 * screen loses focus or the app goes inactive. Samples stay in memory.
 */
export function useForegroundLocation(active: boolean) {
  const [location, setLocation] = useState<ForegroundLocation>({ status: 'idle' });
  const lastQueried = useRef<{ sample: LocationSample; queriedAt: number } | null>(null);
  const generation = useRef(0);

  const accept = useCallback((sample: LocationSample, force: boolean) => {
    const now = Date.now();
    if (!force && !shouldRequery(lastQueried.current, sample, now)) return;
    lastQueried.current = { sample, queriedAt: now };
    setLocation({ status: 'ready', sample, quality: assessSample(sample, now) });
  }, []);

  const locate = useCallback(async () => {
    const run = ++generation.current;
    setLocation((current) => ({ status: 'locating', sample: current.status === 'ready' ? current.sample : null }));
    const recent = await getLastKnown();
    if (run !== generation.current) return;
    if (recent) accept(recent, true);
    const fresh = await getCurrent();
    if (run !== generation.current) return;
    if (fresh) accept(fresh, true);
    else if (!recent) setLocation({ status: 'unavailable' });
  }, [accept]);

  useEffect(() => {
    if (!active) {
      generation.current++;
      return;
    }
    let stopWatch: (() => void) | null = null;
    let cancelled = false;
    const start = async () => {
      await locate();
      if (cancelled) return;
      stopWatch = await watch((sample) => accept(sample, false)).catch(() => null);
      if (cancelled) stopWatch?.();
    };
    const stop = () => {
      stopWatch?.();
      stopWatch = null;
    };
    start();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (!stopWatch) start();
      } else stop();
    });
    return () => {
      cancelled = true;
      generation.current++;
      subscription.remove();
      stop();
    };
  }, [active, accept, locate]);

  return { location, refresh: locate };
}
