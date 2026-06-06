import { NavLink, useNavigate } from "react-router-dom";
import { Home, Compass, QrCode, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/app", label: "Home", icon: Home, end: true },
  { to: "/app/quests", label: "Quests", icon: Compass, end: false },
  { to: "/app/community-notes", label: "Notes", icon: MessageSquare, end: false },
  { to: "/app/profile", label: "Profile", icon: User, end: false },
];

/** Mobile-first bottom navigation with a central "Check In" (scan) action. */
export default function BottomNav() {
  const navigate = useNavigate();
  const left = items.slice(0, 2);
  const right = items.slice(2);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-end justify-between px-4 pb-[env(safe-area-inset-bottom)] pt-2">
        {left.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        {/* Center check-in button */}
        <button
          onClick={() => navigate("/app/checkin")}
          className="-mt-6 flex flex-col items-center gap-1"
          aria-label="Check In"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-coral text-primary-foreground shadow-[var(--shadow-glow-coral)] glow-coral">
            <QrCode className="h-7 w-7" />
          </span>
          <span className="text-[11px] font-medium text-primary">Check In</span>
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
  icon: typeof Home;
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
