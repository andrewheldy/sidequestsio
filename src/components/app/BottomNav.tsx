import { NavLink, useNavigate } from "react-router-dom";
import { Compass, Map, QrCode, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * New bottom navigation: Explore · Map · Scan (center) · Progress · Profile.
 * The old "Home" / "Quests" tabs are gone — Explore is now the home surface and
 * quests are discovered from there and the Map.
 *
 * Note: there is no dedicated Progress page yet, so that tab points at the
 * user's saved quests (Favorites) as the interim "your journey" surface. The
 * href is the only thing to change once a Progress page ships.
 */
const left = [
  { to: "/app/explore", label: "Explore", icon: Compass, end: false },
  { to: "/app/map", label: "Map", icon: Map, end: false },
];

const right = [
  { to: "/app/favorites", label: "Progress", icon: Trophy, end: false },
  { to: "/app/profile", label: "Profile", icon: User, end: false },
];

export default function BottomNav() {
  const navigate = useNavigate();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-end justify-between px-4 pb-[env(safe-area-inset-bottom)] pt-2">
        {left.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        {/* Center scan action */}
        <button
          onClick={() => navigate("/app/checkin")}
          className="-mt-6 flex flex-col items-center gap-1"
          aria-label="Scan"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-coral text-primary-foreground shadow-[var(--shadow-glow-coral)] glow-coral">
            <QrCode className="h-7 w-7" />
          </span>
          <span className="text-[11px] font-medium text-primary">Scan</span>
        </button>

        {right.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: typeof Compass;
  end: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex w-14 flex-col items-center gap-1 py-1 text-[11px] transition-colors",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )
      }
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </NavLink>
  );
}
