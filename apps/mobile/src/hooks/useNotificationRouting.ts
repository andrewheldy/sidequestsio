import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { routeFromNotification } from '../lib/adventure/notifications';
import { recordNudgeResult } from '../lib/adventure/server';
import { getSession } from '../lib/auth/session';

/**
 * Opens the quest a nearby alert points to, from a cold start (the response
 * that launched the app) or a warm one (a tap while running). The quest
 * screen re-checks current server state; "opened" is recorded best effort.
 */
export function useNotificationRouting() {
  useEffect(() => {
    let handled: string | null = null;
    const open = (response: Notifications.NotificationResponse | null) => {
      const route = routeFromNotification(response);
      const id = response?.notification.request.identifier ?? null;
      if (!route || id === handled) return;
      handled = id;
      router.push(route.url as `/quests/${string}`);
      if (route.claimId) {
        const claimId = route.claimId;
        getSession().then((session) => session && recordNudgeResult(claimId, 'opened', { accessToken: session.accessToken }).catch(() => undefined));
      }
    };
    open(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
}
