import { Navigate, Outlet } from 'react-router-dom';
import BottomNav from '@/components/app/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';

/**
 * Mobile-first shell for the in-app experience. Renders the active tab via
 * <Outlet /> and a persistent bottom navigation. Centered to a phone-width
 * column so it reads well on desktop too.
 *
 * Guests may preview Explore/Map. Signed-in users who haven't finished
 * onboarding are routed there first.
 */
export function AppLayout() {
  const { loading, user, profile } = useAuth();

  if (loading) return <LoadingScreen />;

  if (user && profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

export default AppLayout;
