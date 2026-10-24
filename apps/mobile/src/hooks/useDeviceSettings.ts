import { useCallback, useEffect, useState } from 'react';
import { loadSettings, saveSettings, type DeviceSettings } from '../lib/storage/deviceStore';

export function useDeviceSettings() {
  const [settings, setSettings] = useState<DeviceSettings | null>(null);

  useEffect(() => {
    let mounted = true;
    loadSettings().then((loaded) => mounted && setSettings(loaded));
    return () => {
      mounted = false;
    };
  }, []);

  const update = useCallback(async (patch: Partial<Omit<DeviceSettings, 'installationId'>>) => {
    const next = await saveSettings(patch);
    setSettings(next);
    return next;
  }, []);

  return { settings, update };
}
