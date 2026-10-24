import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getSession } from '../auth/session';
import { ADVENTURE_DISCLOSURE_VERSION } from '../config';
import { getPermissions } from '../location/adapter';
import { loadAdventureState, loadSettings, saveAdventureState } from '../storage/deviceStore';
import { GEOFENCE_TASK, refreshBundleInBackground } from './controller';
import { isDiscoveryVisible, showInAppSuggestion } from './foreground';
import { notificationsGranted, scheduleNudge } from './notifications';
import { processGeofenceEvent, type PipelineDeps } from './pipeline';
import { claimNudge, recordNudgeResult } from './server';

// Defined at module scope and imported by index.ts before the router starts
// (expo-task-manager requirement). The handler depends on no React state and
// must never throw.

export const pipelineDeps: PipelineDeps = {
  now: () => Date.now(),
  loadState: loadAdventureState,
  saveState: saveAdventureState,
  loadSettings,
  getSession,
  permissionsStillGranted: async () => {
    const permissions = await getPermissions().catch(() => null);
    return !!permissions && permissions.background === 'granted' && permissions.precise && (await notificationsGranted());
  },
  isDiscoveryVisible,
  showInAppSuggestion,
  claim: claimNudge,
  recordResult: recordNudgeResult,
  schedule: scheduleNudge,
  refreshBundle: refreshBundleInBackground,
  policyVersion: ADVENTURE_DISCLOSURE_VERSION,
};

type GeofenceTaskData = { eventType: Location.LocationGeofencingEventType; region: Location.LocationRegion };

if (!TaskManager.isTaskDefined(GEOFENCE_TASK)) {
  TaskManager.defineTask<GeofenceTaskData>(GEOFENCE_TASK, async ({ data, error }) => {
    if (error || !data?.region?.identifier) return;
    const type = data.eventType === Location.LocationGeofencingEventType.Enter ? 'enter' : 'exit';
    try {
      await processGeofenceEvent({ type, regionId: data.region.identifier }, pipelineDeps);
    } catch {
      // Fail closed: no notification, nothing queued.
    }
  });
}
