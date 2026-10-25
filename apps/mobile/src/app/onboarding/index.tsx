import { useLocalSearchParams } from 'expo-router';
import { first } from '../../features/account/params';
import { OnboardingFlow } from '../../features/onboarding/OnboardingFlow';

export default function Onboarding() {
  const params = useLocalSearchParams<{ returnTo?: string }>();
  return <OnboardingFlow returnTo={first(params.returnTo)} />;
}
