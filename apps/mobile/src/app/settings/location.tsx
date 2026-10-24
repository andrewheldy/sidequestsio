import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../components/theme';
import { useCapability } from '../../hooks/useCapability';
import { useDeviceSettings } from '../../hooks/useDeviceSettings';
import { reconcileAdventure, startAdventure, stopAdventure } from '../../lib/adventure/controller';
import { notificationsGranted, requestNotifications } from '../../lib/adventure/notifications';
import { deviceTimeZone } from '../../lib/adventure/quietHours';
import { recordConsent, saveNudgeSettings, type ConsentPurpose } from '../../lib/adventure/server';
import { getSession } from '../../lib/auth/session';
import { ADVENTURE_DISCLOSURE_VERSION, getConfig } from '../../lib/config';
import { getCurrent, requestBackground, requestForeground } from '../../lib/location/adapter';
import type { DesiredMode } from '../../lib/storage/deviceStore';

export const ADVENTURE_DISCLOSURE =
  'SideQuests uses your location in the background to notice when you are near eligible quests and send optional nearby alerts, even when you are not using the app. We use proximity checks rather than saving a route history. We keep a minimal record of which alerts were sent, for up to 30 days, to enforce alert limits and troubleshoot. You can pause this in Settings at any time.';

const MODES: { mode: DesiredMode; title: string; body: string }[] = [
  { mode: 'manual', title: 'Choose an area', body: 'Browse by neighborhood. No device location is used.' },
  { mode: 'explore', title: 'Explore near me', body: 'Uses your location only while the app is open, to sort quests by distance.' },
  { mode: 'adventure', title: 'Adventure', body: 'Explore, plus optional nearby alerts when the app is closed.' },
];

export default function LocationSettingsScreen() {
  const { settings, update } = useDeviceSettings();
  const { capability, permissions, signedIn, refresh } = useCapability(settings);
  const [disclosure, setDisclosure] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [maxPerDay, setMaxPerDay] = useState<0 | 1 | 2>(2);
  const adventureAvailable = getConfig().adventureEnabled;
  const timeZone = deviceTimeZone();

  const choose = async (mode: DesiredMode) => {
    setMessage(null);
    if (mode === 'adventure') return setDisclosure(true);
    if (settings?.desiredMode === 'adventure') await stopAdventure('mode_change');
    if (mode === 'explore' && permissions?.foreground !== 'granted') {
      const next = await requestForeground().catch(() => null);
      if (next?.foreground !== 'granted') setMessage('Location permission was not granted, so Explore will use the area you choose.');
    }
    await update({ desiredMode: mode });
    await refresh();
  };

  /** Each step is its own system prompt; declining one stops here and keeps foreground discovery. */
  const enableAdventure = async () => {
    setDisclosure(false);
    const session = await getSession();
    if (!session) return setMessage('Sign in to use nearby alerts. Explore still works without an account.');
    let next = permissions;
    if (next?.foreground !== 'granted') next = await requestForeground().catch(() => null);
    if (next?.foreground !== 'granted') return setMessage('Nearby alerts need location permission.');
    if (next.background !== 'granted') next = await requestBackground().catch(() => null);
    if (next?.background !== 'granted') {
      return setMessage('Nearby alerts need “Always” location access. You can allow it later in system settings.');
    }
    const notifications = (await notificationsGranted()) || (await requestNotifications());
    if (!notifications) return setMessage('Nearby alerts need notification permission. Explore keeps working without it.');

    const { installationId } = await update({ desiredMode: 'adventure', adventurePaused: false });
    const purposes: ConsentPurpose[] = ['location_foreground', 'location_background', 'notifications'];
    await Promise.all(purposes.map((p) => recordConsent(session, p, true, ADVENTURE_DISCLOSURE_VERSION, installationId).catch(() => undefined)));
    await saveNudgeSettings(session, { maxPerDay, timezone: timeZone }).catch(() => undefined);
    const sample = await getCurrent({ precise: true });
    const started = sample ? await startAdventure(sample) : { ok: false as const, reason: 'location_unavailable' };
    setMessage(started.ok ? 'Adventure is on.' : 'Adventure is set up, but nearby alerts could not start yet. We’ll try again next time you open the app.');
    await refresh();
  };

  const togglePause = async () => {
    if (!settings) return;
    if (settings.adventurePaused) {
      await update({ adventurePaused: false });
      await reconcileAdventure(true);
    } else {
      await stopAdventure('pause');
      await update({ adventurePaused: true });
    }
    await refresh();
  };

  const changeCap = async (value: 0 | 1 | 2) => {
    setMaxPerDay(value);
    const session = await getSession();
    if (session) await saveNudgeSettings(session, { maxPerDay: value, timezone: timeZone }).catch(() => undefined);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {capability && <Text accessibilityLiveRegion="polite" style={styles.status}>{capability.summary}</Text>}
        {message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}

        <Text accessibilityRole="header" style={styles.heading}>How SideQuests finds quests</Text>
        {MODES.filter((m) => m.mode !== 'adventure' || adventureAvailable).map(({ mode, title, body }) => {
          const selected = settings?.desiredMode === mode;
          return (
            <Pressable
              key={mode}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => choose(mode)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text style={styles.optionTitle}>{selected ? `✓ ${title}` : title}</Text>
              <Text style={styles.body}>{body}</Text>
            </Pressable>
          );
        })}
        {!adventureAvailable && <Text style={styles.body}>Nearby alerts aren’t available in this version yet.</Text>}

        {disclosure && (
          <View style={styles.panel}>
            <Text accessibilityRole="header" style={styles.optionTitle}>Enable nearby nudges?</Text>
            <Text style={styles.body}>{ADVENTURE_DISCLOSURE}</Text>
            <Text style={styles.body}>
              Next we’ll ask for “Always” location and notification permission, one at a time. Saying no keeps Explore working.
            </Text>
            <View style={styles.row}>
              <Pressable accessibilityRole="button" style={styles.primary} onPress={enableAdventure}>
                <Text style={styles.primaryLabel}>Enable nearby nudges</Text>
              </Pressable>
              <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => setDisclosure(false)}>
                <Text style={styles.secondaryLabel}>Not now</Text>
              </Pressable>
            </View>
          </View>
        )}

        {settings?.desiredMode === 'adventure' && (
          <View style={styles.panel}>
            <Text accessibilityRole="header" style={styles.optionTitle}>Nearby alerts</Text>
            <Pressable accessibilityRole="switch" accessibilityState={{ checked: settings.adventurePaused }} onPress={togglePause} style={styles.secondary}>
              <Text style={styles.secondaryLabel}>{settings.adventurePaused ? 'Resume nearby alerts' : 'Pause nearby alerts'}</Text>
            </Pressable>
            {signedIn && (
              <>
                <Text style={styles.body}>Alerts per day (at most)</Text>
                <View style={styles.row}>
                  {([2, 1, 0] as const).map((value) => (
                    <Pressable
                      key={value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: maxPerDay === value }}
                      onPress={() => changeCap(value)}
                      style={[styles.secondary, maxPerDay === value && styles.optionSelected]}
                    >
                      <Text style={styles.secondaryLabel}>{maxPerDay === value ? `✓ ${value}` : String(value)}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            <Text style={styles.body}>
              {`Quiet hours: 9 PM – 10 AM${timeZone ? ` (${timeZone})` : ''}. No more than one alert every 3 hours, and never the same quest twice in a week.`}
            </Text>
          </View>
        )}

        <Pressable accessibilityRole="link" onPress={() => Linking.openSettings().catch(() => undefined)}>
          <Text style={styles.link}>Open system settings</Text>
        </Pressable>
        <Text style={styles.body}>
          Entering an area or opening an alert never completes a quest or earns XP or Points. Your exact location is not saved.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, gap: 12 },
  heading: { fontSize: 20, fontWeight: '600', color: colors.ink },
  status: { fontSize: 15, fontWeight: '600', color: colors.ink },
  message: { fontSize: 15, color: colors.text, backgroundColor: colors.subtle, padding: 12, borderRadius: 8 },
  option: { padding: 14, gap: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  optionSelected: { borderColor: colors.ink, borderWidth: 2 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: colors.ink },
  body: { fontSize: 14, lineHeight: 21, color: colors.text },
  panel: { gap: 10, padding: 14, borderRadius: 12, backgroundColor: colors.subtle },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  primary: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.ink },
  primaryLabel: { color: colors.surface, fontWeight: '600' },
  secondary: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.ink },
  secondaryLabel: { color: colors.ink, fontWeight: '600' },
  link: { color: colors.ocean, fontWeight: '600', fontSize: 15, paddingVertical: 6 },
});
