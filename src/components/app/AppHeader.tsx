import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function AppHeader({ title, subtitle }: AppHeaderProps) {
  const { user, profile } = useAuth();
  const initials = (profile?.display_name ?? (user?.user_metadata?.display_name as string | undefined) ?? "Q").slice(0, 1).toUpperCase();

  return (
    <header className="flex items-center justify-between gap-3 pt-2">
      <Link to="/app" className="flex flex-col">
        <span className="font-poppins text-xl font-extrabold italic text-gradient-coral">
          SIDEQUESTS
        </span>
        {title && (
          <span className="mt-1 font-poppins text-lg font-bold text-foreground">
            {title}
          </span>
        )}
        {subtitle && (
          <span className="text-sm text-muted-foreground">{subtitle}</span>
        )}
      </Link>

      <div className="flex items-center gap-3">
        <button
          className="relative rounded-full p-2 text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>
        <Link to="/app/profile">
          <Avatar className="h-9 w-9 ring-2 ring-turquoise/50">
            <AvatarFallback className="bg-muted text-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}
