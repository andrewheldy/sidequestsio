import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { NudgeNotification } from './pipeline';

export const NUDGE_CHANNEL_ID = 'nearby-quests';
const NUDGE_PREFIX = 'nudge:';
const QUEST_ROUTE = /^\/quests\/[A-Za-z0-9-]{1,64}$/;

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export async function notificationsGranted() {
  const permission = await Notifications.getPermissionsAsync().catch(() => null);
  return permission?.granted === true;
}

/** Only after the user taps "Enable nearby alerts" — never at startup. */
export async function requestNotifications() {
  await ensureNudgeChannel();
  const permission = await Notifications.requestPermissionsAsync().catch(() => null);
  return permission?.granted === true;
}

export async function ensureNudgeChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(NUDGE_CHANNEL_ID, {
    name: 'Nearby quests',
    description: 'Optional alerts when you are near an eligible quest',
    importance: Notifications.AndroidImportance.DEFAULT,
  }).catch(() => undefined);
}

/** Schedules one immediate local notification. Success means scheduled, not seen. */
export async function scheduleNudge(nudge: NudgeNotification) {
  try {
    await ensureNudgeChannel();
    await Notifications.scheduleNotificationAsync({
      identifier: nudge.identifier,
      content: {
        title: nudge.title,
        body: nudge.body,
        // Only a route and claim id: no coordinates, no venue location.
        data: { url: `/quests/${nudge.questId}`, claimId: nudge.claimId },
      },
      trigger: Platform.OS === 'android' ? { channelId: NUDGE_CHANNEL_ID } : null,
    });
    return true;
  } catch {
    return false;
  }
}

/** Cancels pending and removes delivered nearby alerts (best effort; shown ones may already be seen). */
export async function cancelNudges() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(NUDGE_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => undefined)),
  );
  const presented = await Notifications.getPresentedNotificationsAsync().catch(() => []);
  await Promise.all(
    presented
      .filter((n) => n.request.identifier.startsWith(NUDGE_PREFIX))
      .map((n) => Notifications.dismissNotificationAsync(n.request.identifier).catch(() => undefined)),
  );
}

/** The in-app route a tapped notification may open; anything else is ignored. */
export function routeFromNotification(response: Notifications.NotificationResponse | null) {
  const data = response?.notification.request.content.data as { url?: unknown; claimId?: unknown } | undefined;
  const url = typeof data?.url === 'string' && QUEST_ROUTE.test(data.url) ? data.url : null;
  return url ? { url, claimId: typeof data?.claimId === 'string' ? data.claimId : null } : null;
}
