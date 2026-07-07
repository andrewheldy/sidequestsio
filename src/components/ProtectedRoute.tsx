import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';

/**
 * Gates protected areas:
 *  - signed-out users are sent to /auth
 *  - signed-in users whose profile is missing (legacy accounts) or whose
 *    onboarding is unfinished are sent to /onboarding, which creates/repairs
 *    the profile row on completion
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, profileLoading, user, profile } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  // Right after sign-in the profile hasn't loaded yet — wait rather than
  // misrouting an onboarded user to /onboarding.
  if (!profile && profileLoading) return <LoadingScreen />;

  if (!profile || !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace state={{ next: location.pathname }} />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
