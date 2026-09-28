import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Gift, Map } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { track } from '@/lib/analytics/events';
import type { AppEventName } from '@/types/events';
// Default "You" avatar: the SideQuests explorer, for anyone without a photo.
import explorerAvatar from '@/assets/sidequests-explorer-avatar.svg';

type Tab = 'rewards' | 'map' | 'profile';

/** Which tab a path belongs to. Discovery surfaces (explore, quests, a quest page) live under Map. */
function tabForPath(pathname: string): Tab | null {
  if (pathname.startsWith('/app/rewards')) return 'rewards';
  if (/^\/app\/(profile|settings|favorites)/.test(pathname)) return 'profile';
  if (/^\/app\/(map|explore|quests|community-notes|checkin)/.test(pathname) || pathname.startsWith('/quests/')) {
    return 'map';
  }
  return null;
}

const NAV_EVENT: Record<Tab, AppEventName> = {
  rewards: 'nav_rewards_clicked',
  map: 'nav_map_clicked',
  profile: 'nav_profile_clicked',
};

/**
 * Global app navigation — exactly three destinations: Rewards, Map (centre)
 * and You. There is deliberately no camera/scan item: capture belongs to quest
 * actions that need a photo, and venue codes open straight from the phone's
 * own camera (/scan/<code>).
 */
export default function BottomNav() {
  const { pathname } = useLocation();
  const { user, profile, loading } = useAuth();
  const active = tabForPath(pathname);

  const onNav = (tab: Tab) =>
    track(NAV_EVENT[tab], {
      user_id: user?.id ?? null,
      props: { tracking_id: `nav.${tab}`, from_path: pathname, was_active: active === tab },
    });

  return (
    <nav
      aria-label="App navigation"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-xl rounded-t-[2rem] border border-b-0 border-white/10 bg-midnight-950/95 text-sand-50 shadow-[0_-18px_50px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl"
    >
      <ul className="grid h-[76px] grid-cols-3 items-center px-4 pb-[env(safe-area-inset-bottom)] box-content">
        <li className="flex justify-center">
          <NavTab to="/app/rewards" label="Rewards" isActive={active === 'rewards'} onClick={() => onNav('rewards')}>
            <Gift className="h-7 w-7" strokeWidth={1.6} aria-hidden />
          </NavTab>
        </li>
        <li className="flex justify-center">
          <NavTab to="/app/map" label="Map" isActive={active === 'map'} onClick={() => onNav('map')}>
            <Map className="h-8 w-8" strokeWidth={1.6} aria-hidden />
          </NavTab>
        </li>
        <li className="flex justify-center">
          <NavTab to="/app/profile" label="You" isActive={active === 'profile'} onClick={() => onNav('profile')}>
            <ProfileAvatar
              loading={loading}
              src={profile?.avatar_url ?? null}
              isActive={active === 'profile'}
            />
          </NavTab>
        </li>
      </ul>
    </nav>
  );
}

function NavTab({
  to,
  label,
  isActive,
  onClick,
  children,
}: {
  to: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group relative flex min-h-[64px] min-w-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl pt-1 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
        isActive ? 'text-gold' : 'text-sand-50/80 hover:text-sand-50',
      )}
    >
      <span className="transition-transform duration-150 group-active:scale-90 motion-reduce:transition-none">
        {children}
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.28em]">{label}</span>
      <span
        aria-hidden
        className={cn(
          'absolute -bottom-0.5 h-1 w-10 rounded-full bg-gold transition-opacity duration-150',
          isActive ? 'opacity-100' : 'opacity-0',
        )}
      />
    </Link>
  );
}

function ProfileAvatar({ src, loading, isActive }: { src: string | null; loading: boolean; isActive: boolean }) {
  const [failed, setFailed] = useState<string | null>(null);
  const ring = isActive ? 'ring-gold' : 'ring-sand-50/25';

  if (loading) return <span className={cn('sq-skeleton block h-9 w-9 rounded-full ring-2', ring)} />;
  // No photo (guest, or signed in without one) or a broken URL → the explorer.
  const shown = src && failed !== src ? src : explorerAvatar;
  return (
    <img
      src={shown}
      alt=""
      width={36}
      height={36}
      decoding="async"
      onError={() => setFailed(src)}
      className={cn('h-9 w-9 rounded-full bg-midnight-800 object-cover ring-2', ring)}
    />
  );
}
