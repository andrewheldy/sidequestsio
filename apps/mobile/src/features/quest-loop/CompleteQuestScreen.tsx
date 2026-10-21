import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Button, Card, EmptyState, ErrorState, LoadingState, Screen, SetupRequired, Text } from '../../components/ui';
import { backend } from '../../lib/config';
import { isValidQuestId } from '../../lib/navigation/returnTo';
import { queryKeys } from '../../lib/queryClient';
import type { QuestWithContext } from '../../lib/types';
import { accountGate } from '../../session/accountGate';
import { useSession } from '../../session/SessionProvider';
import { colors, spacing } from '../../theme/tokens';
import { isQuestAvailable } from '../discovery/questFormat';
import { useQuest } from '../discovery/useQuests';
import { completeQuest, generateInstance, getLatestCompletion, recordCodeScan, type OfferOutcome } from './api';
import { parseScanPayload } from './scanCode';
import { clearPendingScan, loadPendingScan, savePendingScan, type PendingScan } from './storage';
import { formatDate, offerKey, pendingScanKey, questStatusOptions } from './useQuestStatus';

const BLOCKED_MESSAGES = {
  unconfigured: 'SideQuests is unavailable in this build right now.',
  restoring: 'Still restoring your account. Try again in a moment.',
  loading: 'Still loading your profile. Try again in a moment.',
  error: "We couldn't load your profile. Open the Profile tab to retry, then come back.",
} as const;

function useLeave(questId: string) {
  const router = useRouter();
  return () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/quests/[questId]', params: { questId } }));
}

/**
 * Route entry. It enforces the account gate itself because /quests/<id>/complete
 * can be opened directly by a deep link, not only from the detail CTA.
 */
export function CompleteQuestScreen({ questId }: { questId: string | undefined }) {
  const router = useRouter();
  const { state, userId } = useSession();
  const valid = isValidQuestId(questId);
  const gate = valid ? accountGate(state, { kind: 'quest', questId }) : null;

  useEffect(() => {
    if (!valid) return;
    const g = accountGate(state, { kind: 'quest', questId });
    if (g.kind === 'redirect') router.replace(g.href);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-evaluate on status change only
  }, [state.status, questId, valid]);

  if (!valid) {
    return (
      <Screen>
        <EmptyState icon="compass-outline" title="Quest not found" message="This link doesn't point to a quest." action={<Button label="Explore quests" onPress={() => router.replace('/')} />} />
      </Screen>
    );
  }
  if (backend.status !== 'ready' || gate?.kind === 'blocked') {
    return (
      <Screen>
        {backend.status !== 'ready' ? (
          <SetupRequired />
        ) : (
          <EmptyState icon="lock-closed-outline" title="Not ready yet" message={BLOCKED_MESSAGES[(gate as { reason: keyof typeof BLOCKED_MESSAGES }).reason]} />
        )}
      </Screen>
    );
  }
  if (gate?.kind === 'redirect' || !userId) {
    return (
      <Screen>
        <LoadingState label="Taking you to sign in…" />
      </Screen>
    );
  }
  return <QuestLoader key={userId} questId={questId} userId={userId} />;
}

function QuestLoader({ questId, userId }: { questId: string; userId: string }) {
  const query = useQuest(questId);
  const leave = useLeave(questId);
  if (query.isPending) {
    return (
      <Screen>
        <LoadingState label="Loading quest…" />
      </Screen>
    );
  }
  if (query.isError) {
    return (
      <Screen>
        <ErrorState title="Couldn't load this quest" message="Check your connection and try again." onRetry={() => void query.refetch()} />
      </Screen>
    );
  }
  if (!query.data || !isQuestAvailable(query.data)) {
    return (
      <Screen>
        <EmptyState icon="compass-outline" title="Quest not available" message="This quest doesn't exist or isn't active right now." action={<Button label="Back" variant="secondary" onPress={leave} />} />
      </Screen>
    );
  }
  if (query.data.verification_type !== 'qr') {
    return (
      <Screen>
        <EmptyState
          icon="construct-outline"
          title="Not supported in the app yet"
          message="This quest type can't be completed in the app yet. Only quests verified by a SideQuests QR code can be completed here."
          action={<Button label="Back to quest" variant="secondary" onPress={leave} />}
        />
      </Screen>
    );
  }
  return <QrFlow quest={query.data} userId={userId} />;
}

type Phase = 'idle' | 'camera' | 'verifying' | 'completing';
interface Notice {
  tone: 'error' | 'info';
  text: string;
}
type Outcome =
  | { kind: 'success'; xp: number | null; points: number | null; leveledUp: boolean; newLevel: number | null }
  | { kind: 'recovered'; xp: number | null; points: number | null }
  | { kind: 'completed'; completedAt: string | null }
  | { kind: 'cooldown'; availableAt: string | null };

function QrFlow({ quest, userId }: { quest: QuestWithContext; userId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const leave = useLeave(quest.id);
  const [permission, requestPermission] = useCameraPermissions();

  const offer = useQuery({
    queryKey: offerKey(userId, quest.id),
    queryFn: () => generateInstance(quest.id),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const status = useQuery({ ...questStatusOptions(userId, quest), retry: false });

  const [scan, setScan] = useState<PendingScan | null>(null);
  const [restored, setRestored] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [retryCode, setRetryCode] = useState<string | null>(null);
  const [otherQuestId, setOtherQuestId] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  /** Ignores further camera frames while one scan is being handled. */
  const scanLock = useRef(false);
  /** Single-flight guard for complete_quest: set synchronously on the first tap. */
  const completing = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadPendingScan(userId, quest.id).then((stored) => {
      if (cancelled) return;
      setScan((current) => current ?? stored);
      setRestored(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, quest.id]);

  const refreshPending = () => queryClient.invalidateQueries({ queryKey: pendingScanKey(userId, quest.id), exact: true });
  const dropScan = async () => {
    setScan(null);
    await clearPendingScan(userId, quest.id);
    void refreshPending();
  };
  /** After a confirmed server-side completion: refresh derived reads (not the offer). */
  const invalidateAfterCompletion = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.account.progress(userId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.account.completions(userId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.account.questStatus(userId, quest.id), exact: true });
    void refreshPending();
  };

  // What the server already says about this quest (display; complete_quest re-checks).
  const serverDone: Outcome | null =
    offer.data?.kind === 'already_completed'
      ? { kind: 'completed', completedAt: status.data?.kind === 'completed' ? status.data.completedAt : null }
      : offer.data?.kind === 'cooldown'
        ? { kind: 'cooldown', availableAt: offer.data.availableAt }
        : status.data?.kind === 'completed'
          ? { kind: 'completed', completedAt: status.data.completedAt }
          : status.data?.kind === 'cooldown'
            ? { kind: 'cooldown', availableAt: status.data.availableAt }
            : null;

  useEffect(() => {
    if (serverDone && !outcome && scan) void dropScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverDone?.kind, !!scan]);

  const offerInstance = offer.data?.kind === 'available' ? offer.data.instance : null;

  // ---- scanning ----------------------------------------------------------
  const startScan = async () => {
    setNotice(null);
    setRetryCode(null);
    setOtherQuestId(null);
    if (permission?.granted) {
      setCameraDenied(false);
      scanLock.current = false;
      setPhase('camera');
      return;
    }
    if (permission && permission.canAskAgain === false && permission.status === 'denied') {
      setCameraDenied(true);
      return;
    }
    const result = await requestPermission();
    if (result?.granted) {
      setCameraDenied(false);
      scanLock.current = false;
      setPhase('camera');
    } else {
      setCameraDenied(true);
    }
  };

  const verify = async (code: string) => {
    setPhase('verifying');
    setNotice(null);
    setRetryCode(null);
    try {
      const result = await recordCodeScan(code);
      if (result.kind === 'invalid_code') {
        setNotice({ tone: 'error', text: "That's not a SideQuests quest code. Scan the code at the venue again." });
      } else if (result.questId !== quest.id) {
        setOtherQuestId(result.questId);
        setNotice({ tone: 'error', text: 'This code is for a different quest, so it does not count here.' });
      } else {
        const next: PendingScan = {
          userId,
          questId: quest.id,
          scanId: result.scanId,
          scannedAt: result.scannedAt,
          instanceId: offerInstance?.id ?? null,
        };
        await savePendingScan(next);
        setScan(next);
        setUncertain(false);
        void refreshPending();
      }
    } catch {
      setRetryCode(code);
      setNotice({ tone: 'error', text: "We couldn't verify the code. Check your connection and try again." });
    } finally {
      setPhase('idle');
      scanLock.current = false;
    }
  };

  const onBarcodeScanned = (event: { data?: unknown }) => {
    if (scanLock.current) return;
    scanLock.current = true;
    const code = parseScanPayload(event?.data);
    if (!code) {
      setPhase('idle');
      setNotice({ tone: 'error', text: "That's not a SideQuests quest code. Scan the code at the venue again." });
      scanLock.current = false;
      return;
    }
    void verify(code);
  };

  // ---- completion --------------------------------------------------------
  const finish = async (done: Outcome) => {
    setOutcome(done);
    setUncertain(false);
    setScan(null);
    await clearPendingScan(userId, quest.id);
    invalidateAfterCompletion();
  };

  /** The call's outcome is unknown: ask the server whether this scan produced a completion. */
  const recover = async (current: PendingScan) => {
    try {
      const latest = await getLatestCompletion(userId, quest.id);
      if (latest && latest.source_scan_id === current.scanId) {
        await finish({ kind: 'recovered', xp: latest.xp_awarded, points: latest.points_awarded });
        return;
      }
    } catch {
      /* fall through: still unconfirmed */
    }
    setUncertain(true);
    setNotice({
      tone: 'error',
      text: "We couldn't confirm your completion, so nothing is shown as earned yet. Your verified scan is saved. Try again.",
    });
  };

  const complete = async () => {
    if (completing.current || !scan) return;
    completing.current = true;
    setPhase('completing');
    setNotice(null);
    const current = scan;
    try {
      let result;
      try {
        result = await completeQuest({ questId: quest.id, scanId: current.scanId, instanceId: current.instanceId });
      } catch {
        await recover(current);
        return;
      }
      if (result.kind === 'success') {
        await finish({ kind: 'success', xp: result.xp, points: result.points, leveledUp: result.leveledUp, newLevel: result.newLevel });
        return;
      }
      switch (result.error) {
        case 'scan_required':
        case 'verification_failed':
          await dropScan();
          setNotice({ tone: 'error', text: 'Your scan expired or was already used — scan the code again.' });
          break;
        case 'already_completed': {
          let row = null;
          try {
            row = await getLatestCompletion(userId, quest.id);
          } catch {
            /* the quest is complete either way */
          }
          await finish({ kind: 'completed', completedAt: row?.completed_at ?? null });
          break;
        }
        case 'cooldown':
          await finish({ kind: 'cooldown', availableAt: result.availableAt });
          break;
        case 'instance_invalid':
          await refreshInstance(current);
          break;
        case 'quest_inactive':
        case 'quest_expired':
        case 'not_found':
          setNotice({ tone: 'error', text: "This quest isn't available right now." });
          break;
        default:
          setUncertain(true);
          setNotice({ tone: 'error', text: 'Something went wrong completing the quest. Nothing was awarded. Try again.' });
      }
    } finally {
      completing.current = false;
      setPhase('idle');
    }
  };

  /** instance_invalid: fetch the current objective, then let the user confirm again. */
  const refreshInstance = async (current: PendingScan) => {
    try {
      const next: OfferOutcome = await generateInstance(quest.id);
      queryClient.setQueryData(offerKey(userId, quest.id), next);
      if (next.kind === 'available') {
        const updated: PendingScan = { ...current, instanceId: next.instance?.id ?? null };
        await savePendingScan(updated);
        setScan(updated);
        setNotice({ tone: 'info', text: 'Your quest objective was refreshed. Review it, then tap Complete quest again.' });
        return;
      }
    } catch {
      /* fall through */
    }
    setNotice({ tone: 'error', text: "We couldn't refresh your quest objective. Try again." });
  };

  // ---- views -------------------------------------------------------------
  if (outcome) return <OutcomeView quest={quest} outcome={outcome} onBack={leave} onExplore={() => router.replace('/')} />;
  if (serverDone) return <OutcomeView quest={quest} outcome={serverDone} onBack={leave} onExplore={() => router.replace('/')} />;

  if (!restored || offer.isPending) {
    return (
      <Screen>
        <LoadingState label="Checking your quest…" />
      </Screen>
    );
  }
  if (offer.isError) {
    return (
      <Screen>
        <ErrorState
          title="Couldn't load your quest"
          message="Check your connection and try again."
          onRetry={() => {
            void offer.refetch();
            void status.refetch();
          }}
        />
      </Screen>
    );
  }
  if (offer.data?.kind === 'unavailable') {
    return (
      <Screen>
        <EmptyState icon="compass-outline" title="Quest not available" message="This quest isn't available to complete right now." action={<Button label="Back" variant="secondary" onPress={leave} />} />
      </Screen>
    );
  }

  if (phase === 'camera') {
    return (
      <Screen scroll={false} padded={false} edges={['left', 'right', 'bottom']}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onBarcodeScanned}
        />
        <View style={styles.cameraBar}>
          <Text variant="bodyStrong" style={styles.center}>
            Point the camera at the SideQuests code at the venue.
          </Text>
          <Button label="Cancel" variant="secondary" onPress={leave} />
        </View>
      </Screen>
    );
  }
  if (phase === 'verifying') {
    return (
      <Screen>
        <LoadingState label="Checking your code…" />
      </Screen>
    );
  }
  if (cameraDenied && !scan) {
    return (
      <Screen>
        <EmptyState
          icon="camera-outline"
          title="Camera access is off"
          message="SideQuests uses the camera only to read the quest code at the venue. Allow camera access in Settings to scan it."
          action={
            <View style={styles.actions}>
              <Button label="Open settings" icon="settings-outline" onPress={() => void Linking.openSettings().catch(() => undefined)} />
              <Button label="Cancel" variant="secondary" onPress={leave} />
            </View>
          }
        />
      </Screen>
    );
  }

  const objective = offerInstance?.objective ?? quest.funky_action ?? quest.action_prompt ?? quest.description;
  const detail = offerInstance ? offerInstance.prompt : quest.funky_action ? quest.action_prompt : null;
  const venueName = quest.venue?.name;

  return (
    <Screen>
      <Text variant="overline" color={colors.accent}>
        {venueName ? venueName : 'Complete quest'}
      </Text>
      <Text variant="title" accessibilityRole="header">
        {quest.title}
      </Text>

      {notice ? <NoticeView notice={notice} /> : null}
      {retryCode ? <Button label="Try again" variant="secondary" icon="refresh" onPress={() => void verify(retryCode)} /> : null}
      {otherQuestId && isValidQuestId(otherQuestId) ? (
        <Button
          label="Open that quest"
          variant="secondary"
          onPress={() => router.replace({ pathname: '/quests/[questId]', params: { questId: otherQuestId } })}
        />
      ) : null}

      <Card title="Your objective">
        {objective ? <Text variant="heading">{objective}</Text> : null}
        {detail ? <Text muted>{detail}</Text> : null}
      </Card>

      {scan ? (
        <Card title="Scan verified — not completed yet">
          <Text accessibilityLiveRegion="polite">
            Your scan is verified, but this quest is NOT complete and nothing has been earned yet. Do the objective, then confirm.
          </Text>
          <Button
            label={uncertain ? 'Try again' : 'Complete quest'}
            icon="checkmark-circle-outline"
            loading={phase === 'completing'}
            onPress={() => void complete()}
          />
          <Button label="Scan again" variant="ghost" onPress={() => void startScan()} disabled={phase === 'completing'} />
          {cameraDenied ? (
            <Button label="Open settings" variant="ghost" onPress={() => void Linking.openSettings().catch(() => undefined)} />
          ) : null}
        </Card>
      ) : (
        <Card title="At the venue">
          <Text muted>Find the SideQuests code at the venue, then scan it to prove you were there.</Text>
          <Button label="Scan the SideQuests code" icon="qr-code-outline" onPress={() => void startScan()} />
          <Button label="Not now" variant="ghost" onPress={leave} />
        </Card>
      )}
    </Screen>
  );
}

function NoticeView({ notice }: { notice: Notice }) {
  return (
    <View accessibilityLiveRegion="polite">
      <Text color={notice.tone === 'error' ? colors.error : colors.warning}>{notice.text}</Text>
    </View>
  );
}

function OutcomeView({ quest, outcome, onBack, onExplore }: { quest: QuestWithContext; outcome: Outcome; onBack: () => void; onExplore: () => void }) {
  if (outcome.kind === 'success' || outcome.kind === 'recovered') {
    const xp = outcome.xp != null ? `+${outcome.xp} XP` : null;
    const points = outcome.points != null ? `+${outcome.points} Points` : null;
    return (
      <Screen>
        <EmptyState
          icon="trophy-outline"
          title="Quest complete!"
          message={quest.title}
          action={
            <View style={styles.actions}>
              {xp || points ? (
                <Text variant="heading" accessibilityLiveRegion="polite">
                  {[xp, points].filter(Boolean).join('  ·  ')}
                </Text>
              ) : (
                <Text muted>Your rewards were added to your account.</Text>
              )}
              {outcome.kind === 'success' && outcome.leveledUp ? (
                <Text variant="bodyStrong" color={colors.xp}>
                  {outcome.newLevel != null ? `Level up! You reached level ${outcome.newLevel}.` : 'Level up!'}
                </Text>
              ) : null}
              {outcome.kind === 'recovered' ? (
                <Text variant="small" muted>
                  Confirmed from your account after a connection problem.
                </Text>
              ) : null}
              <Button label="Back to quest" onPress={onBack} />
              <Button label="Explore more" variant="secondary" onPress={onExplore} />
            </View>
          }
        />
      </Screen>
    );
  }
  const title = outcome.kind === 'completed' ? 'Quest completed' : outcome.availableAt ? `Available again on ${formatDate(outcome.availableAt)}` : 'Available again later';
  const message =
    outcome.kind === 'completed'
      ? outcome.completedAt
        ? `You completed this quest on ${formatDate(outcome.completedAt)}.`
        : 'You have already completed this quest.'
      : 'You completed this quest recently. It comes back after its cooldown.';
  return (
    <Screen>
      <EmptyState
        icon={outcome.kind === 'completed' ? 'checkmark-circle-outline' : 'time-outline'}
        title={title}
        message={message}
        action={
          <View style={styles.actions}>
            <Button label="Back to quest" onPress={onBack} />
            <Button label="Explore more" variant="secondary" onPress={onExplore} />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  camera: { flex: 1 },
  cameraBar: { padding: spacing.md, gap: spacing.sm, backgroundColor: colors.background },
  center: { textAlign: 'center' },
  actions: { alignSelf: 'stretch', alignItems: 'stretch', gap: spacing.sm },
});
