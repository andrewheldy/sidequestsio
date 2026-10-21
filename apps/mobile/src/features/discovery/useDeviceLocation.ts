import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Coords } from './geo';

export type LocationStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable';

/**
 * Foreground location, one-shot. Never prompts by itself: on mount it only
 * reads a permission the user already granted; `request` (the "Near me" tap)
 * is the only place the OS prompt can appear. No background tracking.
 */
export function useDeviceLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');
  const active = useRef(true);

  const read = useCallback(async () => {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    if (active.current) setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
  }, []);

  useEffect(() => {
    active.current = true;
    Location.getForegroundPermissionsAsync()
      .then(async (perm) => {
        if (!perm.granted || !active.current) return;
        setStatus('locating');
        await read();
        if (active.current) setStatus('granted');
      })
      .catch(() => {
        if (active.current) setStatus('unavailable');
      });
    return () => {
      active.current = false;
    };
  }, [read]);

  const request = useCallback(async (): Promise<boolean> => {
    setStatus('locating');
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!active.current) return false;
      if (!perm.granted) {
        setStatus('denied');
        return false;
      }
      await read();
      if (active.current) setStatus('granted');
      return true;
    } catch {
      if (active.current) setStatus('unavailable');
      return false;
    }
  }, [read]);

  return { coords, status, request };
}
