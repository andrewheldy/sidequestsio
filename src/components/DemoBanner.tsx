import { isDemoMode } from "@/lib/demo";
import { useDemoSession } from "@/contexts/DemoSessionContext";
import { FlaskConical, LogIn, LogOut } from "lucide-react";

export function DemoBanner() {
  const { isDemoSignedIn, toggle } = useDemoSession();
  if (!isDemoMode) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500/90 px-4 py-2 text-xs font-medium text-amber-950 backdrop-blur-sm">
      <span className="flex items-center gap-1.5 truncate">
        <FlaskConical className="h-3.5 w-3.5 shrink-0" />
        <span className="font-semibold">Demo Mode: Mock Data</span>
        <span className="hidden sm:inline opacity-70">— no Supabase required</span>
      </span>
      <button
        onClick={toggle}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-950/15 px-3 py-1 transition-colors hover:bg-amber-950/25 active:scale-95"
      >
        {isDemoSignedIn ? (
          <><LogOut className="h-3.5 w-3.5" /> Sign out</>
        ) : (
          <><LogIn className="h-3.5 w-3.5" /> Quick sign-in</>
        )}
      </button>
    </div>
  );
}
