import { NavLink } from 'react-router-dom';
import { Compass, Heart, Map, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/app/explore', label: 'Explore', icon: Compass },
  { to: '/app/map', label: 'Map', icon: Map },
  { to: '/app/favorites', label: 'Favorites', icon: Heart },
  { to: '/app/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-5 w-5', isActive && 'fill-primary/10')} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default BottomNav;
