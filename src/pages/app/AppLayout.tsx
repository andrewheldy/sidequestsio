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
  const { loading, profileLoading, user, profile } = useAuth();

  if (loading) return <LoadingScreen />;

  // Signed in but profile not yet known — wait, don't misroute.
  if (user && !profile && profileLoading) return <LoadingScreen />;

  // Missing profile row (legacy account) or unfinished onboarding both route
  // to onboarding, which creates/repairs the row on completion.
  if (user && (!profile || !profile.onboarding_completed)) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-2xl px-5 pb-28 pt-5">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

export default AppLayout;
