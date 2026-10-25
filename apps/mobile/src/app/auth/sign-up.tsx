import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Linking, TextInput, View } from 'react-native';
import { Button, Screen, Text, TextField, Wordmark } from '../../components/ui';
import { policyLinks } from '../../lib/config';
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from '../../lib/legal';
import { clearPendingReturn, decodeReturnTarget, savePendingReturn } from '../../lib/navigation/returnTo';
import { requireSupabase } from '../../lib/supabase';
import { classifyAuthError, messageForKind } from '../../features/account/authErrors';
import { CheckRow, FormMessage } from '../../features/account/components';
import { first } from '../../features/account/params';
import { AuthStateGate } from '../../features/account/postAuth';
import { authRedirectUrl } from '../../features/account/redirects';
import { emailError, newPasswordError, normalizeEmail } from '../../features/account/validation';
import { colors, spacing } from '../../theme/tokens';

export default function SignUp() {
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo = first(params.returnTo);
  return (
    <AuthStateGate returnTo={returnTo}>
      <SignUpForm returnTo={returnTo} />
    </AuthStateGate>
  );
}

function SignUpForm({ returnTo }: { returnTo?: string }) {
  const router = useRouter();
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Consent is explicit: both start unchecked and are never inferred.
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const emailProblem = touched ? emailError(email) : null;
  const passwordProblem = touched ? newPasswordError(password) : null;
  const routeParams = returnTo ? { returnTo } : {};

  async function submit() {
    setTouched(true);
    setError(null);
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }
    if (emailError(email) || newPasswordError(password)) return;

    setSubmitting(true);
    const target = decodeReturnTarget(returnTo);
    try {
      // Persist the destination before leaving the app for the confirmation email.
      if (target) await savePendingReturn(target);
      const name = displayName.trim();
      const { data, error: authError } = await requireSupabase().auth.signUp({
        email: normalizeEmail(email),
        password,
        options: {
          // Same metadata the website sends; handle_new_auth_user() records consent from it.
          data: {
            ...(name ? { display_name: name } : {}),
            terms_version: CURRENT_TERMS_VERSION,
            privacy_version: CURRENT_PRIVACY_VERSION,
            marketing_opt_in: marketingOptIn,
          },
          emailRedirectTo: authRedirectUrl('signup'),
        },
      });
      if (authError) {
        if (target) await clearPendingReturn();
        setError(messageForKind(classifyAuthError(authError)));
        return;
      }
      // An existing confirmed email comes back as a user with no identities.
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        if (target) await clearPendingReturn();
        setError(messageForKind('already_registered'));
        return;
      }
      // With confirmation off, a session is already active and AuthStateGate routes onward.
      if (!data?.session) {
        router.replace({ pathname: '/auth/verify-email', params: { email: normalizeEmail(email), ...routeParams } });
      }
    } catch (e) {
      setError(messageForKind(classifyAuthError(e as Error)));
    } finally {
      setSubmitting(false);
    }
  }

  const open = (url: string) => void Linking.openURL(url);

  return (
    <Screen keyboard>
      <View style={{ gap: spacing.lg }}>
        <Wordmark width={140} />
        <View style={{ gap: spacing.xs }}>
          <Text variant="title" accessibilityRole="header">
            Make Miami your field guide.
          </Text>
          <Text muted>Save quests and keep a record of what you find.</Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <TextField
            label="Display name (optional)"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            submitBehavior="submit"
            editable={!submitting}
            placeholder="Miami Explorer"
          />
          <TextField
            ref={emailRef}
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
            hint="Use at least 6 characters. A longer passphrase is easier to remember and safer."
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
            editable={!submitting}
          />
        </View>

        <View style={{ gap: spacing.xs }}>
          <CheckRow
            testID="consent-terms"
            checked={agreedToTerms}
            onToggle={() => setAgreedToTerms((v) => !v)}
            label="I agree to the Terms of Service and Privacy Policy"
          >
            <Text variant="small" muted>
              I agree to the{' '}
              <Text variant="small" color={colors.accent} accessibilityRole="link" onPress={() => open(policyLinks.terms)} style={{ textDecorationLine: 'underline' }}>
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text variant="small" color={colors.accent} accessibilityRole="link" onPress={() => open(policyLinks.privacy)} style={{ textDecorationLine: 'underline' }}>
                Privacy Policy
              </Text>
              .
            </Text>
          </CheckRow>
          <CheckRow
            testID="consent-marketing"
            checked={marketingOptIn}
            onToggle={() => setMarketingOptIn((v) => !v)}
            label="Send me emails about quests, rewards, launches, city updates, events and promotions (optional)"
          >
            <Text variant="small" muted>
              Send me emails about quests, rewards, launches, city updates, events and promotions. (Optional)
            </Text>
          </CheckRow>
        </View>

        {error ? <FormMessage tone="error">{error}</FormMessage> : null}

        <Button label="Create account" onPress={() => void submit()} loading={submitting} disabled={submitting || !agreedToTerms} />

        <View style={{ gap: spacing.xs }}>
          <Button
            label="Already have an account? Sign in"
            variant="ghost"
            accessibilityRole="link"
            onPress={() => router.replace({ pathname: '/auth/sign-in', params: routeParams })}
          />
          <Button label="Keep browsing" variant="ghost" onPress={() => router.replace('/')} />
        </View>
      </View>
    </Screen>
  );
}
