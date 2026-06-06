import { Outlet } from 'react-router-dom';
import BottomNav from '@/components/app/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';

/**
 * Mobile-first shell for the in-app experience (Explore / Map / Favorites).
 * Renders the active outlet and a persistent bottom navigation.
 * Guests may freely access Explore and Map; Favorites requires auth via RequireAuth.
 */
export function AppLayout() {
  const { loading } = useAuth();

  if (loading) return <LoadingScreen />;

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
