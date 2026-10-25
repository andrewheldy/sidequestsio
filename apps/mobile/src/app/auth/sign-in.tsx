import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { TextInput, View } from 'react-native';
import { Button, Screen, Text, TextField, Wordmark } from '../../components/ui';
import { requireSupabase } from '../../lib/supabase';
import { decodeReturnTarget, savePendingReturn } from '../../lib/navigation/returnTo';
import { classifyAuthError, messageForKind } from '../../features/account/authErrors';
import { FormMessage } from '../../features/account/components';
import { first } from '../../features/account/params';
import { AuthStateGate } from '../../features/account/postAuth';
import { authRedirectUrl } from '../../features/account/redirects';
import { emailError, normalizeEmail } from '../../features/account/validation';
import { spacing } from '../../theme/tokens';

export default function SignIn() {
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo = first(params.returnTo);
  return (
    <AuthStateGate returnTo={returnTo}>
      <SignInForm returnTo={returnTo} />
    </AuthStateGate>
  );
}

function SignInForm({ returnTo }: { returnTo?: string }) {
  const router = useRouter();
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const emailProblem = touched ? emailError(email) : null;
  const passwordProblem = touched && !password ? 'Enter your password.' : null;
  const routeParams = returnTo ? { returnTo } : {};

  async function submit() {
    setTouched(true);
    setNotice(null);
    if (emailError(email) || !password) return;
    setSubmitting(true);
    setError(null);
    setNeedsConfirmation(false);
    try {
      const { error: authError } = await requireSupabase().auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      });
      if (authError) {
        const kind = classifyAuthError(authError);
        setError(messageForKind(kind));
        setNeedsConfirmation(kind === 'email_not_confirmed');
      }
      // On success the session event moves the state; AuthStateGate routes onward.
    } catch (e) {
      setError(messageForKind(classifyAuthError(e as Error)));
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setSubmitting(true);
    setNotice(null);
    try {
      const target = decodeReturnTarget(returnTo);
      if (target) await savePendingReturn(target);
      const { error: resendError } = await requireSupabase().auth.resend({
        type: 'signup',
        email: normalizeEmail(email),
        options: { emailRedirectTo: authRedirectUrl('signup') },
      });
      if (resendError) setError(messageForKind(classifyAuthError(resendError)));
      else {
        setError(null);
        setNeedsConfirmation(false);
        router.replace({ pathname: '/auth/verify-email', params: { email: normalizeEmail(email), ...routeParams } });
      }
    } catch (e) {
      setError(messageForKind(classifyAuthError(e as Error)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen keyboard>
      <View style={{ gap: spacing.lg }}>
        <Wordmark width={140} />
        <View style={{ gap: spacing.xs }}>
          <Text variant="title" accessibilityRole="header">
            Welcome back.
          </Text>
          <Text muted>Pick up where you left off and find something worth going out for.</Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={emailProblem}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            submitBehavior="submit"
            editable={!submitting}
            placeholder="you@example.com"
          />
          <TextField
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={passwordProblem}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
            editable={!submitting}
          />
        </View>

        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        {notice ? <FormMessage tone="success">{notice}</FormMessage> : null}

        <Button label="Sign in" onPress={() => void submit()} loading={submitting} disabled={submitting} />
        {needsConfirmation ? (
          <Button label="Resend confirmation email" variant="secondary" onPress={() => void resend()} disabled={submitting} />
        ) : null}

        <View style={{ gap: spacing.xs }}>
          <Button
            label="Forgot password?"
            variant="ghost"
            accessibilityRole="link"
            onPress={() => router.push('/auth/forgot-password')}
          />
          <Button
            label="New here? Create an account"
            variant="ghost"
            accessibilityRole="link"
            onPress={() => router.replace({ pathname: '/auth/sign-up', params: routeParams })}
          />
          <Button label="Keep browsing" variant="ghost" onPress={() => router.replace('/')} />
        </View>
      </View>
    </Screen>
  );
}
