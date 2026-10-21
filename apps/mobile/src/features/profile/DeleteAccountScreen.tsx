import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { Button, Card, Screen, Text } from '../../components/ui';
import { policyLinks, supportEmail } from '../../lib/config';
import { spacing } from '../../theme/tokens';
import { FormMessage } from '../account/components';
import { DELETION_SUBJECT, deletionMailto } from './deletion';
import { useAccount, type ReadyAccount } from './useAccount';

type Outcome = 'idle' | 'opened' | 'unavailable';

export function DeleteAccountScreen() {
  const { account, gate } = useAccount();
  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: 'Delete account' }} />
      {account ? <DeleteRequest account={account} /> : gate}
    </Screen>
  );
}

function DeleteRequest({ account }: { account: ReadyAccount }) {
  const [outcome, setOutcome] = useState<Outcome>('idle');

  async function openEmail() {
    const url = deletionMailto(account.email, account.userId);
    try {
      // openURL rejects when no mail app can handle it (canOpenURL needs extra
      // manifest queries on Android 11+, so it is not used here).
      await Linking.openURL(url);
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
      <Text variant="title" accessibilityRole="header">
        Delete your account
      </Text>
      <Text muted>
        Deletion is handled by our support team. Sending the email below starts the request; nothing is deleted until we process it,
        within 30 days. We confirm by email.
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
      <Button
        label="Read the deletion policy"
        variant="ghost"
        onPress={() => void Linking.openURL(policyLinks.deleteAccount).catch(() => undefined)}
      />
    </View>
  );
}
