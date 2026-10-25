import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Button, Card, Screen, Text } from '../../components/ui';
import { policyLinks, supportEmail } from '../../lib/config';
import { queryKeys } from '../../lib/queryClient';
import type { PrivacyPreferences } from '../../lib/types';
import { useSession } from '../../session/SessionProvider';
import { colors, spacing, touchTarget } from '../../theme/tokens';
import { FormMessage } from '../account/components';
import { getPrivacy, recordMarketingConsent, savePrivacy, updateOwnProfile, type ProfilePatch } from './api';
import { supportMailto } from './deletion';
import { useAccount, type ReadyAccount } from './useAccount';

type ToggleKey = 'is_public' | 'show_completed_quests' | 'leaderboard' | 'marketing';

export function SettingsScreen() {
  const { account, gate } = useAccount();
  return <Screen edges={['left', 'right', 'bottom']}>{account ? <Settings account={account} /> : gate}</Screen>;
}

function Settings({ account }: { account: ReadyAccount }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { refreshProfile, signOut } = useSession();
  const { userId, profile } = account;
  const privacy = useQuery({ queryKey: queryKeys.account.privacy(userId), queryFn: () => getPrivacy(userId) });
  const [pending, setPending] = useState<Partial<Record<ToggleKey, boolean>>>({});
  const [error, setError] = useState<string | null>(null);

  const privacyReady = privacy.isSuccess;
  const prefs = privacy.data;
  const current: Record<ToggleKey, boolean> = {
    is_public: profile.is_public === true,
    show_completed_quests: profile.show_completed_quests === true,
    leaderboard: prefs?.leaderboard_visibility === 'public',
    marketing: prefs?.marketing_consent === true,
    ...pending,
  };

  /** Optimistic: the switch moves immediately and snaps back if the write is rejected. */
  async function change(key: ToggleKey, next: boolean, write: () => Promise<void>) {
    setError(null);
    setPending((p) => ({ ...p, [key]: next }));
    try {
      await write();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'That change could not be saved.');
    } finally {
      setPending((p) => {
        const { [key]: _removed, ...rest } = p;
        return rest;
      });
    }
  }

  const profileToggle = (key: 'is_public' | 'show_completed_quests') => (next: boolean) =>
    change(key, next, async () => {
      await updateOwnProfile(userId, { [key]: next } satisfies ProfilePatch);
      await refreshProfile();
    });

  const patchPrivacyCache = (patch: Partial<PrivacyPreferences>) =>
    queryClient.setQueryData<PrivacyPreferences | null>(queryKeys.account.privacy(userId), (old) => ({
      user_id: userId,
      analytics_consent: true,
      marketing_consent: false,
      location_consent: false,
      leaderboard_visibility: 'public',
      profile_visibility: 'public',
      ...old,
      ...patch,
    }));

  const leaderboardToggle = (next: boolean) =>
    change('leaderboard', next, async () => {
      const visibility = next ? 'public' : 'private';
      await savePrivacy(userId, { leaderboard_visibility: visibility });
      patchPrivacyCache({ leaderboard_visibility: visibility });
    });

  const marketingToggle = (next: boolean) =>
    change('marketing', next, async () => {
      const previous = prefs?.marketing_consent === true;
      await savePrivacy(userId, { marketing_consent: next });
      try {
        await recordMarketingConsent(userId, next);
      } catch (e) {
        // Do not keep a preference change that has no consent record.
        await savePrivacy(userId, { marketing_consent: previous }).catch(() => undefined);
        throw e;
      }
      patchPrivacyCache({ marketing_consent: next });
    });

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void signOut().then(() => router.replace('/'));
        },
      },
    ]);
  }

  return (
    <View style={styles.stack}>
      <Card title="Account">
        <View accessible accessibilityLabel={`Email: ${account.email ?? 'unknown'}`}>
          <Text variant="caption" muted>
            Email
          </Text>
          <Text>{account.email ?? 'Not available'}</Text>
        </View>
        <LinkRow icon="person-outline" label="Edit profile" onPress={() => router.push('/settings/edit-profile')} />
      </Card>

      <Card title="Privacy">
        <SwitchRow
          label="Public profile"
          description="Let others find your profile page (name, username, avatar, bio)."
          value={current.is_public}
          busy={'is_public' in pending}
          onChange={profileToggle('is_public')}
        />
        <SwitchRow
          label="Show completed quests"
          description="Show your completed quests on your public profile."
          value={current.show_completed_quests}
          busy={'show_completed_quests' in pending}
          onChange={profileToggle('show_completed_quests')}
        />
        <SwitchRow
          label="Show me on leaderboards"
          value={current.leaderboard}
          busy={'leaderboard' in pending}
          disabled={!privacyReady}
          onChange={leaderboardToggle}
        />
        <SwitchRow
          label="Marketing emails"
          description="Occasional emails about new quests and rewards. Off unless you turn it on."
          value={current.marketing}
          busy={'marketing' in pending}
          disabled={!privacyReady}
          onChange={marketingToggle}
        />
        {privacy.isError ? (
          <View style={styles.gap}>
            <Text variant="small" muted accessibilityLiveRegion="polite">
              Leaderboard and email preferences are unavailable right now.
            </Text>
            <Button label="Retry preferences" variant="secondary" icon="refresh" onPress={() => void privacy.refetch()} />
          </View>
        ) : null}
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      </Card>

      <Card title="Security">
        <LinkRow icon="key-outline" label="Change password" onPress={() => router.push('/auth/forgot-password')} />
      </Card>

      <Card title="Permissions">
        <Text variant="small" muted>
          SideQuests asks for your location only when you use Near me or check in with GPS (or in the background, if you turn on nearby alerts), and for the camera only when you scan a quest code.
          Allowing or denying either never changes your email or privacy choices. You can change them in your device settings.
        </Text>
        <Button label="Location & camera permissions" variant="secondary" icon="settings-outline" onPress={() => void Linking.openSettings()} />
        <LinkRow icon="navigate-outline" label="Location & nearby alerts" onPress={() => router.push('/settings/location')} />
      </Card>

      <Card title="Legal & support">
        <LinkRow icon="document-text-outline" label="Terms of Service" external onPress={() => openLink(policyLinks.terms)} />
        <LinkRow icon="shield-checkmark-outline" label="Privacy Policy" external onPress={() => openLink(policyLinks.privacy)} />
        <LinkRow icon="people-outline" label="Community Guidelines" external onPress={() => openLink(policyLinks.communityGuidelines)} />
        <LinkRow icon="trash-outline" label="Account deletion policy" external onPress={() => openLink(policyLinks.deleteAccount)} />
        <LinkRow icon="mail-outline" label="Contact support" external onPress={contactSupport} />
      </Card>

      <Button label="Sign out" variant="secondary" icon="log-out-outline" onPress={confirmSignOut} />
      <Button label="Delete account" variant="danger" icon="trash-outline" onPress={() => router.push('/settings/delete-account')} />
    </View>
  );
}

function openLink(url: string) {
  Linking.openURL(url).catch(() => Alert.alert('Could not open the link', url));
}

async function contactSupport() {
  try {
    await Linking.openURL(supportMailto());
  } catch {
    Alert.alert('Contact support', `Email us at ${supportEmail}.`);
  }
}

function SwitchRow({
  label,
  description,
  value,
  busy,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  busy?: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchText}>
        <Text variant="bodyStrong">{label}</Text>
        {description ? (
          <Text variant="small" muted>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled || busy}
        accessibilityRole="switch"
        accessibilityState={{ disabled: !!(disabled || busy) }}
        accessibilityLabel={label}
        trackColor={{ true: colors.accent, false: colors.disabled }}
      />
    </View>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
  external,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  external?: boolean;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole={external ? 'link' : 'button'} accessibilityLabel={label} style={styles.linkRow}>
      <Ionicons name={icon} size={20} color={colors.textMuted} importantForAccessibility="no" />
      <Text style={styles.switchText}>{label}</Text>
      <Ionicons name={external ? 'open-outline' : 'chevron-forward'} size={18} color={colors.textMuted} importantForAccessibility="no" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  gap: { gap: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: touchTarget },
  switchText: { flex: 1, gap: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: touchTarget },
});
