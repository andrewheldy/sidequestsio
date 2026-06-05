import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';

/**
 * Gates protected areas:
 *  - signed-out users are sent to /auth
 *  - signed-in users who haven't finished onboarding are sent to /onboarding
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, user, profile } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  if (profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
