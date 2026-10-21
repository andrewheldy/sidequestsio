import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Screen, Text } from '../../components/ui';
import { requireSupabase } from '../../lib/supabase';
import { classifyAuthError, messageForKind } from '../../features/account/authErrors';
import { FormMessage } from '../../features/account/components';
import { first } from '../../features/account/params';
import { AuthStateGate } from '../../features/account/postAuth';
import { authRedirectUrl } from '../../features/account/redirects';
import { emailError, normalizeEmail } from '../../features/account/validation';
import { spacing } from '../../theme/tokens';

export const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmail() {
  const params = useLocalSearchParams<{ email?: string; returnTo?: string }>();
  const returnTo = first(params.returnTo);
  const email = first(params.email) ?? '';
  return (
    <AuthStateGate returnTo={returnTo}>
      <VerifyEmailBody email={email} returnTo={returnTo} />
    </AuthStateGate>
  );
}

function VerifyEmailBody({ email, returnTo }: { email: string; returnTo?: string }) {
  const router = useRouter();
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const canResend = !emailError(email);
  const routeParams = returnTo ? { returnTo } : {};

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function resend() {
    setSending(true);
    setMessage(null);
    try {
      const { error } = await requireSupabase().auth.resend({
        type: 'signup',
        email: normalizeEmail(email),
        options: { emailRedirectTo: authRedirectUrl('signup') },
      });
      if (error) setMessage({ tone: 'error', text: messageForKind(classifyAuthError(error)) });
      else {
        setMessage({ tone: 'success', text: 'Sent. It can take a minute to arrive.' });
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } catch (e) {
      setMessage({ tone: 'error', text: messageForKind(classifyAuthError(e as Error)) });
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="title" accessibilityRole="header">
            Check your email
          </Text>
          <Text muted>
            {canResend ? `We sent a confirmation link to ${email}. ` : 'We sent you a confirmation link. '}
            Open it on this device to finish creating your account.
          </Text>
        </View>

        <Card title="Not seeing it?">
          <Text variant="small" muted>
            Check your spam folder. The link opens SideQuests when this app is set up to receive it.
          </Text>
          {canResend ? (
            <Button
              label={cooldown > 0 ? `Resend email (${cooldown}s)` : 'Resend email'}
              variant="secondary"
              onPress={() => void resend()}
              disabled={cooldown > 0 || sending}
              loading={sending}
            />
          ) : null}
        </Card>

        {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}

        <Card>
          <Text variant="bodyStrong">Confirmed in a browser?</Text>
          <Text variant="small" muted>
            Come back and sign in.
          </Text>
          <Button
            label="Sign in"
            onPress={() => router.replace({ pathname: '/auth/sign-in', params: routeParams })}
          />
        </Card>

        <Button
          label="Use a different email"
          variant="ghost"
          onPress={() => router.replace({ pathname: '/auth/sign-up', params: routeParams })}
        />
      </View>
    </Screen>
  );
}
