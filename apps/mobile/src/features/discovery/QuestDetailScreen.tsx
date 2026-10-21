import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Linking, Pressable, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Chip, EmptyState, ErrorState, LoadingState, Screen, SetupRequired, Text } from '../../components/ui';
import { backend, webOrigin } from '../../lib/config';
import type { QuestWithContext } from '../../lib/types';
import { accountGate, type GateResult } from '../../session/accountGate';
import { useSession } from '../../session/SessionProvider';
import { useQuestCta } from '../quest-loop/useQuestStatus';
import { colors, radii, spacing, touchTarget } from '../../theme/tokens';
import { formatMiles, distanceToQuest } from './geo';
import { RewardPills } from './QuestCard';
import { categoryIcon, categoryLabel, directionsUrl, isHttpsUrl, isQuestAvailable, questImage, questLinkItems } from './questFormat';
import { useDeviceLocation } from './useDeviceLocation';
import { useQuest } from './useQuests';

type IconName = ComponentProps<typeof Ionicons>['name'];

const BLOCKED_MESSAGES: Record<Extract<GateResult, { kind: 'blocked' }>['reason'], string> = {
  unconfigured: 'SideQuests is unavailable in this build right now.',
  restoring: 'Still restoring your account. Try again in a moment.',
  loading: 'Still loading your profile. Try again in a moment.',
  error: "We couldn't load your profile. Open the Profile tab to retry, then start the quest.",
};

function useBack() {
  const router = useRouter();
  return () => (router.canGoBack() ? router.back() : router.replace('/'));
}

function RoundButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.round}>
      <Ionicons name={icon} size={22} color={colors.text} />
    </Pressable>
  );
}

/** Back control for states without a hero (the root layout hides this route's header). */
function StateScreen({ children }: { children: React.ReactNode }) {
  const back = useBack();
  return (
    <Screen padded={false} contentStyle={styles.stateContent}>
      <View style={styles.stateBar}>
        <RoundButton icon="arrow-back" label="Go back" onPress={back} />
      </View>
      {children}
    </Screen>
  );
}

export function QuestDetailScreen({ questId }: { questId: string | undefined }) {
  const query = useQuest(questId);
  if (backend.status !== 'ready') {
    return (
      <StateScreen>
        <SetupRequired />
      </StateScreen>
    );
  }
  if (query.isPending) {
    return (
      <StateScreen>
        <LoadingState label="Loading quest…" />
      </StateScreen>
    );
  }
  if (query.isError) {
    return (
      <StateScreen>
        <ErrorState title="Couldn't load this quest" message="Check your connection and try again." onRetry={() => void query.refetch()} />
      </StateScreen>
    );
  }
  if (!query.data || !isQuestAvailable(query.data)) {
    return (
      <StateScreen>
        <EmptyState icon="compass-outline" title="Quest not available" message="This quest doesn't exist or isn't active right now." />
      </StateScreen>
    );
  }
  return <QuestDetail quest={query.data} />;
}

function QuestDetail({ quest }: { quest: QuestWithContext }) {
  const router = useRouter();
  const back = useBack();
  const insets = useSafeAreaInsets();
  const { state } = useSession();
  const location = useDeviceLocation();
  const [blocked, setBlocked] = useState<string | null>(null);
  const cta = useQuestCta(quest);

  const venue = quest.venue;
  const image = questImage(quest);
  const miles = distanceToQuest(location.coords, quest);
  const isQr = quest.verification_type === 'qr';
  const links = questLinkItems(quest.links);
  const directions = directionsUrl(quest);
  const place = venue?.neighborhood || venue?.city || 'Miami';
  const url = `${webOrigin}/quests/${quest.id}`;

  const openUrl = (target: string) => {
    void Linking.openURL(target).catch(() => undefined);
  };

  const start = () => {
    if (!isQr || cta.done) return; // the button is disabled; only QR completion is supported
    setBlocked(null);
    const gate = accountGate(state, { kind: 'quest', questId: quest.id });
    if (gate.kind === 'redirect') router.push(gate.href);
    else if (gate.kind === 'proceed') router.push({ pathname: '/quests/[questId]/complete', params: { questId: quest.id } });
    else setBlocked(BLOCKED_MESSAGES[gate.reason]);
  };

  const share = () => {
    void Share.share({ message: `${quest.title} on SideQuests: ${url}`, url }).catch(() => undefined);
  };

  const yourQuest = quest.funky_action || quest.action_prompt || quest.estimated_time;

  return (
    <Screen padded={false} edges={['left', 'right']} contentStyle={styles.detailContent}>
      <View style={styles.hero}>
        {image ? (
          <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.heroPlaceholder]}>
            <Ionicons name={categoryIcon(quest.category)} size={56} color={colors.textMuted} />
          </View>
        )}
        <LinearGradient colors={['rgba(7,17,31,0.55)', 'transparent', colors.background]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[styles.heroBar, { top: insets.top + spacing.xs }]}>
          <RoundButton icon="arrow-back" label="Go back" onPress={back} />
          <RoundButton icon="share-outline" label="Share this quest" onPress={share} />
        </View>
      </View>

      <View style={styles.body}>
        <Text variant="overline" color={colors.accent}>
          Miami · {categoryLabel(quest.category)}
        </Text>
        <Text variant="display" accessibilityRole="header">
          {quest.title}
        </Text>
        {quest.description ? <Text muted>{quest.description}</Text> : null}
        <View style={styles.chips}>
          <Chip icon={categoryIcon(quest.category)} label={categoryLabel(quest.category)} />
          {miles != null ? <Chip icon="location-outline" label={formatMiles(miles)} /> : null}
          {venue?.hours ? <Chip icon="time-outline" label={venue.hours} /> : null}
        </View>

        <Card title="Your quest">
          {yourQuest ? (
            <>
              {quest.funky_action ? <Text variant="heading">{quest.funky_action}</Text> : null}
              {quest.action_prompt ? <Text muted>{quest.action_prompt}</Text> : null}
              {quest.estimated_time ? <Chip icon="timer-outline" label={quest.estimated_time} /> : null}
            </>
          ) : null}
          <Text variant="small" muted>
            {isQr
              ? 'Verification: scan the SideQuests QR code at the venue to complete this quest.'
              : "Verification: this quest type isn't supported in the app yet."}
          </Text>
          <Button
            label={isQr ? cta.label : 'Start quest'}
            icon={isQr ? cta.icon : 'qr-code-outline'}
            onPress={start}
            disabled={!isQr || cta.done}
            accessibilityHint={isQr ? (cta.done ? 'Nothing to start right now' : 'Starts this quest') : 'Not available: only QR quests can be completed in the app'}
          />
          {isQr && cta.note ? (
            <Text variant="small" muted>
              {cta.note}
            </Text>
          ) : null}
          {!isQr ? (
            <Text variant="small" muted>
              Only QR quests can be completed in the app for now.
            </Text>
          ) : null}
          {blocked ? (
            <Text variant="small" color={colors.warning} accessibilityLiveRegion="polite">
              {blocked}
            </Text>
          ) : null}
        </Card>

        <Card title="Rewards">
          <RewardPills xp={quest.xp_reward} points={quest.points_reward} />
          <Text variant="small" muted>
            XP adds to your explorer level and can&apos;t be spent. Points are your spendable reward balance.
          </Text>
        </Card>

        {venue ? (
          <Card title="About the venue">
            <Text variant="heading">{venue.name}</Text>
            {venue.description ? <Text muted>{venue.description}</Text> : null}
            {venue.hours ? <InfoRow icon="time-outline" text={venue.hours} /> : null}
            {venue.hours_note ? <InfoRow icon="information-circle-outline" text={venue.hours_note} /> : null}
            {venue.price_range ? <InfoRow icon="pricetag-outline" text={venue.price_range} /> : null}
            {venue.address ? <InfoRow icon="location-outline" text={[venue.address, venue.city].filter(Boolean).join(', ')} /> : null}
          </Card>
        ) : null}

        {directions ? (
          <Card title="Getting there">
            <Button
              label="Directions"
              icon="navigate-outline"
              variant="secondary"
              onPress={() => openUrl(directions)}
              accessibilityHint="Opens your maps app"
            />
          </Card>
        ) : null}

        {links.length > 0 ? (
          <Card title="Links">
            <View style={styles.links}>
              {links.map((link) => (
                <Pressable
                  key={link.key}
                  onPress={() => isHttpsUrl(link.url) && openUrl(link.url)}
                  accessibilityRole="link"
                  accessibilityLabel={link.label}
                  accessibilityHint="Opens in your browser"
                  style={styles.link}
                >
                  <Ionicons name={link.icon} size={22} color={colors.text} />
                  <Text variant="small">{link.label}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

function InfoRow({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.textMuted} style={styles.infoIcon} />
      <Text variant="small" style={styles.infoText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stateContent: { flexGrow: 1 },
  stateBar: { padding: spacing.md },
  detailContent: { paddingBottom: spacing.xl },
  hero: { height: 280, backgroundColor: colors.surface },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  heroBar: { position: 'absolute', left: spacing.md, right: spacing.md, flexDirection: 'row', justifyContent: 'space-between' },
  round: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.scrim,
  },
  body: { padding: spacing.md, gap: spacing.md, marginTop: -spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  link: {
    minHeight: touchTarget + 8,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    padding: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  infoRow: { flexDirection: 'row', gap: spacing.xs },
  infoIcon: { marginTop: 1 },
  infoText: { flex: 1 },
});
