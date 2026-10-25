import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { Button, Card, ErrorState, LoadingState, Screen, Text } from '../../components/ui';
import { policyLinks, supportEmail } from '../../lib/config';
import { queryKeys } from '../../lib/queryClient';
import { spacing } from '../../theme/tokens';
import { FormMessage } from '../account/components';
import {
  cancelAccountDeletion,
  DELETION_SUBJECT,
  DeletionUnsupportedError,
  deletionMailto,
  getPendingDeletion,
  requestAccountDeletion,
  type DeletionRequest,
} from './deletion';
import { formatDate } from './format';
import { useAccount, type ReadyAccount } from './useAccount';

export function DeleteAccountScreen() {
  const { account, gate } = useAccount();
  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: 'Delete account' }} />
      {account ? <DeleteRequest account={account} /> : gate}
    </Screen>
  );
}

const messageOf = (error: unknown) =>
  error instanceof Error && error.message ? error.message : 'The request could not be completed. Please try again.';

function DeleteRequest({ account }: { account: ReadyAccount }) {
  const queryClient = useQueryClient();
  const key = queryKeys.account.deletion(account.userId);
  const pending = useQuery({ queryKey: key, queryFn: () => getPendingDeletion(account.userId), retry: false });

  // The server is the only source of the request's state: refetch after every write.
  const onSettled = () => queryClient.invalidateQueries({ queryKey: key });
  const request = useMutation({ mutationFn: requestAccountDeletion, onSettled });
  const cancel = useMutation({ mutationFn: cancelAccountDeletion, onSettled });

  const unsupported =
    pending.error instanceof DeletionUnsupportedError ||
    request.error instanceof DeletionUnsupportedError ||
    cancel.error instanceof DeletionUnsupportedError;

  function confirmRequest() {
    Alert.alert(
      'Request account deletion?',
      'We will permanently delete your account and personal data within 30 days. You can keep using SideQuests and cancel the request until then.',
      [
        { text: 'Keep my account', style: 'cancel' },
        { text: 'Request deletion', style: 'destructive', onPress: () => request.mutate() },
      ],
    );
  }

  function confirmCancel() {
    Alert.alert('Cancel deletion request?', 'Your account will stay as it is.', [
      { text: 'Back', style: 'cancel' },
      { text: 'Cancel request', onPress: () => cancel.mutate() },
    ]);
  }

  let body;
  if (unsupported) {
    body = <EmailRequest account={account} />;
  } else if (pending.isPending) {
    body = <LoadingState label="Checking for a deletion request…" />;
  } else if (pending.isError) {
    body = <ErrorState title="Couldn't check your deletion status" message={messageOf(pending.error)} onRetry={() => void pending.refetch()} />;
  } else if (pending.data) {
    body = <PendingRequest request={pending.data} cancelling={cancel.isPending} error={cancel.error} onCancel={confirmCancel} />;
  } else {
    body = (
      <View style={{ gap: spacing.md }}>
        {cancel.isSuccess ? <FormMessage tone="success">Your deletion request was cancelled.</FormMessage> : null}
        {request.isError ? <FormMessage tone="error">{messageOf(request.error)} Nothing has been requested.</FormMessage> : null}
        <Button
          label="Request account deletion"
          variant="danger"
          icon="trash-outline"
          loading={request.isPending}
          onPress={confirmRequest}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="title" accessibilityRole="header">
        Delete your account
      </Text>
      <Card title="What gets deleted">
        <Text variant="small">Your account credentials and profile (name, username, bio, avatar).</Text>
        <Text variant="small">Your quest history, XP, Points balance and Adventure Log.</Text>
        <Text variant="small">Photos and videos you uploaded as quest proof.</Text>
        <Text variant="small">Your Community Notes.</Text>
        <Text variant="small">Your privacy and marketing preferences.</Text>
      </Card>
      <Text variant="small" muted>
        Some anonymised analytics and records we are legally required to keep may remain. See the full policy for details.
      </Text>
      {body}
      <Button
        label="Read the deletion policy"
        variant="ghost"
        onPress={() => void Linking.openURL(policyLinks.deleteAccount).catch(() => undefined)}
      />
    </View>
  );
}

function PendingRequest({
  request,
  cancelling,
  error,
  onCancel,
}: {
  request: DeletionRequest;
  cancelling: boolean;
  error: unknown;
  onCancel: () => void;
}) {
  return (
    <View style={{ gap: spacing.md }}>
      <Card title="Deletion requested">
        <Text>Requested on {formatDate(request.requested_at)}.</Text>
        <Text>
          We will delete your account by {formatDate(request.process_by)} and confirm by email. Until then your account still exists
          and you can keep using SideQuests.
        </Text>
      </Card>
      {error ? <FormMessage tone="error">{messageOf(error)} Your request is still pending.</FormMessage> : null}
      <Button label="Cancel deletion request" variant="secondary" loading={cancelling} onPress={onCancel} />
    </View>
  );
}

type EmailOutcome = 'idle' | 'opened' | 'unavailable';

/** Used only when the server has no in-app request support (0030 not applied). */
function EmailRequest({ account }: { account: ReadyAccount }) {
  const [outcome, setOutcome] = useState<EmailOutcome>('idle');

  async function openEmail() {
    try {
      // openURL rejects when no mail app can handle it (canOpenURL needs extra
      // manifest queries on Android 11+, so it is not used here).
      await Linking.openURL(deletionMailto(account.email, account.userId));
      setOutcome('opened');
    } catch {
      setOutcome('unavailable');
    }
  }

  function confirm() {
    Alert.alert(
      'Request account deletion?',
      'This opens an email to our support team. Your account is not deleted until we process the request, which can take up to 30 days. Deleting an account is permanent.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open email', style: 'destructive', onPress: () => void openEmail() },
      ],
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      <Text muted>
        Deletion requests are handled by email for now. Sending the email below starts the request; nothing is deleted until we process
        it, within 30 days. We confirm by email.
      </Text>
      {outcome === 'opened' ? (
        <FormMessage tone="success">
          Your email app opened. The request is only sent once you send that email. We will confirm by email.
        </FormMessage>
      ) : null}
      {outcome === 'unavailable' ? (
        <View style={{ gap: spacing.xs }}>
          <FormMessage tone="error">We could not open an email app. Send the request yourself:</FormMessage>
          <Text selectable accessibilityLabel={`Send to ${supportEmail}`}>
            To: {supportEmail}
          </Text>
          <Text selectable>Subject: {DELETION_SUBJECT}</Text>
          <Text selectable>Account email: {account.email ?? 'unknown'}</Text>
          <Text selectable>User ID: {account.userId}</Text>
          <Text variant="small" muted>
            Send it from your account email address. Nothing has been requested yet.
          </Text>
        </View>
      ) : null}
      <Button label="Request deletion by email" variant="danger" icon="mail-outline" onPress={confirm} />
    </View>
  );
}
