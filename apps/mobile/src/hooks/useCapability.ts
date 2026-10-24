import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { computeCapability, type Capability } from '../lib/adventure/capability';
import { notificationsGranted } from '../lib/adventure/notifications';
import { getSession, onSessionChanged } from '../lib/auth/session';
import { getConfig } from '../lib/config';
import { getPermissions } from '../lib/location/adapter';
import type { LocationPermissions } from '../lib/location/types';
import type { DeviceSettings } from '../lib/storage/deviceStore';

/**
 * Effective capability, re-read whenever the app returns to the foreground
 * (permissions can change in system Settings at any time).
 */
export function useCapability(settings: DeviceSettings | null) {
  const [permissions, setPermissions] = useState<LocationPermissions | null>(null);
  const [notifications, setNotifications] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const [nextPermissions, nextNotifications, session] = await Promise.all([
      getPermissions().catch(() => null),
      notificationsGranted().catch(() => false),
      getSession(),
    ]);
    setPermissions(nextPermissions);
    setNotifications(nextNotifications);
    setSignedIn(!!session);
    setLoaded(true);
    return nextPermissions;
  }, []);

  useEffect(() => {
    refresh();
    const appState = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    const unsubscribe = onSessionChanged(() => refresh());
    return () => {
      appState.remove();
      unsubscribe();
    };
  }, [refresh]);

  const config = getConfig();
  const capability: Capability | null = settings && loaded
    ? computeCapability({
        desiredMode: settings.desiredMode,
        paused: settings.adventurePaused,
        nearbyEnabled: config.nearbyEnabled,
        adventureEnabled: config.adventureEnabled,
        backgroundBuild: config.backgroundBuild,
        signedIn,
        permissions,
        notificationsGranted: notifications,
      })
    : null;

  return { capability, permissions, signedIn, refresh };
}
