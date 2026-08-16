import { NavLink, useNavigate } from 'react-router-dom';
import { Compass, Map, QrCode, Bookmark, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const left = [
  { to: '/app/explore', label: 'Explore', icon: Compass },
  { to: '/app/map', label: 'Map', icon: Map },
];

const right = [
  { to: '/app/favorites', label: 'Saved', icon: Bookmark },
  { to: '/app/profile', label: 'Me', icon: User },
];

export default function BottomNav() {
  const navigate = useNavigate();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/96 backdrop-blur-xl" aria-label="App navigation">
      <div className="mx-auto flex h-[72px] max-w-xl items-start justify-between px-3 pb-[env(safe-area-inset-bottom)]">
        {left.map((item) => <NavItem key={item.to} {...item} />)}
        <button type="button" onClick={() => navigate('/app/checkin')} className="group -mt-4 flex min-w-16 flex-col items-center gap-1" aria-label="Scan a quest code">
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[hsl(var(--midnight-900))] text-white shadow-[0_12px_30px_-16px_hsl(var(--midnight-900)/0.8)]">
            <QrCode className="h-6 w-6" />
          </span>
          <span className="text-[11px] font-bold text-foreground">Scan</span>
        </button>
        {right.map((item) => <NavItem key={item.to} {...item} />)}
      </div>
    </nav>
  );
}

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Compass }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => cn(
        'relative flex min-h-[60px] min-w-14 flex-col items-center justify-center gap-1 pt-1 text-[11px] font-bold text-muted-foreground',
        isActive && 'text-[hsl(var(--ocean-700))] after:absolute after:left-2 after:right-2 after:top-0 after:h-0.5 after:bg-[hsl(var(--ocean-500))]',
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </NavLink>
  );
}
