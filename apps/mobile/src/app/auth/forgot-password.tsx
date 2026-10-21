import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Screen, Text, TextField } from '../../components/ui';
import { requireSupabase } from '../../lib/supabase';
import { classifyAuthError, messageForKind } from '../../features/account/authErrors';
import { FormMessage } from '../../features/account/components';
import { authRedirectUrl } from '../../features/account/redirects';
import { emailError, normalizeEmail } from '../../features/account/validation';
import { spacing } from '../../theme/tokens';

/** Shown for every outcome that does not reveal whether an account exists. */
export const NEUTRAL_RESET_MESSAGE =
  'If an account exists for that email, we sent a link to reset your password. Check your inbox and spam folder.';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setTouched(true);
    if (emailError(email)) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: authError } = await requireSupabase().auth.resetPasswordForEmail(normalizeEmail(email), {
        redirectTo: authRedirectUrl('recovery'),
      });
      const kind = authError ? classifyAuthError(authError) : null;
      // Only failures that say nothing about the account (no connection, rate limit) are surfaced;
      // everything else gets the same neutral confirmation.
      if (kind === 'network' || kind === 'rate_limited') setError(messageForKind(kind));
      else setSent(true);
    } catch (e) {
      const kind = classifyAuthError(e as Error);
      if (kind === 'network' || kind === 'rate_limited') setError(messageForKind(kind));
      else setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen keyboard>
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="title" accessibilityRole="header">
            Reset your password
          </Text>
          <Text muted>Enter your email and we will send you a link to choose a new password.</Text>
        </View>

        {sent ? (
          <>
            <FormMessage tone="success">{NEUTRAL_RESET_MESSAGE}</FormMessage>
            <Button label="Back to sign in" onPress={() => router.replace('/auth/sign-in')} />
          </>
        ) : (
          <>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              error={touched ? emailError(email) : null}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={() => void submit()}
              editable={!submitting}
              placeholder="you@example.com"
            />
            {error ? <FormMessage tone="error">{error}</FormMessage> : null}
            <Button label="Send reset link" onPress={() => void submit()} loading={submitting} disabled={submitting} />
            <Button label="Back to sign in" variant="ghost" accessibilityRole="link" onPress={() => router.replace('/auth/sign-in')} />
          </>
        )}
      </View>
    </Screen>
  );
}
