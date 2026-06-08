import { Link, useNavigate } from "react-router-dom";
import { LogOut, Settings, Settings2 } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { StatTile } from "@/components/app/ui";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { levelProgress } from "@/lib/app/leveling";
import { isDemoMode } from "@/lib/demo";

export default function Profile() {
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  const demoProfile =
    isDemoMode && !user
      ? { display_name: "Demo Athlete", xp: 750, level: 5, current_streak: 3 }
      : null;

  const effectiveProfile = profile ?? demoProfile;

  const displayName = effectiveProfile?.display_name ?? user?.email ?? "Athlete";
  const initials = displayName.slice(0, 1).toUpperCase();
  const lvl = levelProgress(effectiveProfile?.xp ?? 0);
  const streak = (effectiveProfile as { current_streak?: number; streak?: number } | null);
  const streakDays = streak?.current_streak ?? streak?.streak ?? 0;

  return (
    <AppLayout title="Profile">
      {/* Avatar + name + settings shortcut */}
      <div className="glass-card mt-2 flex items-center gap-4 p-5">
        <button
          onClick={() => navigate("/app/settings")}
          className="relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Edit profile"
        >
          <Avatar className="h-16 w-16 ring-2 ring-primary/50">
            <AvatarFallback className="bg-muted text-xl">{initials}</AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
            <Settings className="h-3 w-3" />
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-poppins text-xl font-bold text-foreground">
            {displayName}
          </h2>
          <p className="truncate text-sm text-muted-foreground">{user?.email ?? ""}</p>
          <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
            {role}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/app/settings")}
          aria-label="Settings"
          className="h-10 w-10 shrink-0"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* XP / level */}
      <div className="glass-card mt-4 p-4">
        <div className="flex items-center justify-between">
          <span className="font-poppins font-semibold text-foreground">
            Level {lvl.level}
          </span>
          <span className="text-xs text-muted-foreground">
            {lvl.xpIntoLevel}/{lvl.nextLevelXp - lvl.currentLevelXp} XP
          </span>
        </div>
        <Progress value={lvl.progress * 100} className="mt-2 h-2" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <StatTile label="Level" value={lvl.level} accent="turquoise" />
          <StatTile label="Day streak" value={streakDays} accent="coral" />
        </div>
      </div>

      {/* Account settings */}
      <Button asChild variant="outline" className="mt-6 h-11 w-full gap-2">
        <Link to="/app/settings">
          <Settings className="h-4 w-4" /> Account Settings
        </Link>
      </Button>

      {!isDemoMode && (
        <Button
          variant="ghost"
          onClick={signOut}
          className="mt-3 h-11 w-full gap-2 text-destructive"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      )}

      <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
        <Settings2 className="h-3 w-3" /> You control your data. Request export or
        deletion anytime.
      </p>
    </AppLayout>
  );
}
