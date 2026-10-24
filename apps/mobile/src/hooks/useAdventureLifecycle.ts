import { useEffect } from 'react';
import { AppState } from 'react-native';
import { computeCapability } from '../lib/adventure/capability';
import { handleSessionChange, reconcileAdventure } from '../lib/adventure/controller';
import { notificationsGranted } from '../lib/adventure/notifications';
import { getSession, onSessionChanged } from '../lib/auth/session';
import { getConfig } from '../lib/config';
import { getPermissions } from '../lib/location/adapter';
import { loadSettings } from '../lib/storage/deviceStore';

/** Re-checks Adventure prerequisites whenever the app comes to the foreground. */
async function reconcile() {
  const settings = await loadSettings();
  if (settings.desiredMode !== 'adventure') return reconcileAdventure(false);
  if (settings.adventurePaused) return;
  const config = getConfig();
  const capability = computeCapability({
    desiredMode: settings.desiredMode,
    paused: settings.adventurePaused,
    nearbyEnabled: config.nearbyEnabled,
    adventureEnabled: config.adventureEnabled,
    backgroundBuild: config.backgroundBuild,
    signedIn: !!(await getSession()),
    permissions: await getPermissions().catch(() => null),
    notificationsGranted: await notificationsGranted(),
  });
  await reconcileAdventure(capability.adventureActive);
}

export function useAdventureLifecycle() {
  useEffect(() => {
    const run = () => reconcile().catch(() => undefined);
    run();
    const appState = AppState.addEventListener('change', (state) => state === 'active' && run());
    const unsubscribe = onSessionChanged((session) => {
      handleSessionChange(session).catch(() => undefined);
    });
    return () => {
      appState.remove();
      unsubscribe();
    };
  }, []);
}
