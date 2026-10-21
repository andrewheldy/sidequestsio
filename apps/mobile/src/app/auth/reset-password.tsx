import { useRouter } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { TextInput, View } from 'react-native';
import { Button, EmptyState, LoadingState, Screen, SetupRequired, Text, TextField } from '../../components/ui';
import { requireSupabase } from '../../lib/supabase';
import { classifyAuthError, messageForKind } from '../../features/account/authErrors';
import { FormMessage } from '../../features/account/components';
import { newPasswordError } from '../../features/account/validation';
import { useSession } from '../../session/SessionProvider';
import { spacing } from '../../theme/tokens';

/**
 * Only usable with the session created by a recovery link (/auth/callback
 * exchanges the code first). It never takes a returnTo: after success the user
 * goes to their normal signed-in home, not to a half-finished quest flow.
 */
export default function ResetPassword() {
  const router = useRouter();
  const { state } = useSession();
  const confirmRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.status === 'unconfigured') {
    return (
      <Screen>
        <SetupRequired />
      </Screen>
    );
  }
  if (state.status === 'restoring' || state.status === 'loading_profile') {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (state.status === 'guest') {
    return (
      <Screen>
        <EmptyState
          icon="link-outline"
          title="This link has expired"
          message="Password reset links work once and expire. Request a new one to continue."
          action={
            <View style={{ gap: spacing.xs, alignSelf: 'stretch' }}>
              <Button label="Request a new link" onPress={() => router.replace('/auth/forgot-password')} />
              <Button label="Back to sign in" variant="ghost" onPress={() => router.replace('/auth/sign-in')} />
            </View>
          }
        />
      </Screen>
    );
  }

  const passwordProblem = touched ? newPasswordError(password) : null;
  const confirmProblem = touched && !passwordProblem && confirm !== password ? 'Passwords do not match.' : null;
  const needsOnboarding = state.status === 'needs_onboarding';

  async function submit() {
    setTouched(true);
    if (newPasswordError(password) || confirm !== password) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: authError } = await requireSupabase().auth.updateUser({ password });
      if (authError) {
        setError(messageForKind(classifyAuthError(authError)));
        return;
      }
      router.replace(needsOnboarding ? '/onboarding' : '/');
    } catch (e) {
      setError(messageForKind(classifyAuthError(e as Error)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen keyboard>
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="title" accessibilityRole="header">
            Choose a new password
          </Text>
          <Text muted>You will stay signed in on this device.</Text>
        </View>
        <TextField
          label="New password"
          value={password}
          onChangeText={setPassword}
          error={passwordProblem}
          hint="Use at least 6 characters."
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          submitBehavior="submit"
          editable={!submitting}
        />
        <TextField
          ref={confirmRef}
          label="Confirm new password"
          value={confirm}
          onChangeText={setConfirm}
          error={confirmProblem}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
          editable={!submitting}
        />
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        <Button label="Update password" onPress={() => void submit()} loading={submitting} disabled={submitting} />
      </View>
    </Screen>
  );
}
