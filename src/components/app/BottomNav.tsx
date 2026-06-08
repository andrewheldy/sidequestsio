import { NavLink } from "react-router-dom";
import { User, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Minimal nav for the authenticated shell. The full tab set (Home, Log,
// Programs, …) lands with the Trainr app screens in later MVP tickets.
const items = [
  { to: "/app/profile", label: "Profile", icon: User, end: false },
  { to: "/app/settings", label: "Settings", icon: Settings, end: false },
];

/** Mobile-first bottom navigation for the in-app experience. */
export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-end justify-center gap-12 px-4 pb-[env(safe-area-inset-bottom)] pt-2">
        {items.map((item) => (
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
  icon: LucideIcon;
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
