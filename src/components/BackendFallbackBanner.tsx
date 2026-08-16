import { activeBackend } from "@/lib/db";
import { isDemoMode } from "@/lib/demo";
import { AlertTriangle } from "lucide-react";

/**
 * Shown when a deployed (non-dev) build is running on the in-browser
 * LocalRepository because the Supabase env vars were missing at build time.
 * Dev builds are excluded — local dev without Supabase is a supported flow
 * (and demo mode already has its own banner).
 */
export function BackendFallbackBanner() {
  if (isDemoMode || import.meta.env.DEV) return null;
  if (activeBackend() !== "local") return null;

  return (
    <div className="sticky top-0 z-50 flex items-center gap-1.5 bg-red-600/90 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">
        Supabase not configured — showing sample data. Set VITE_SUPABASE_URL and
        VITE_SUPABASE_ANON_KEY in Vercel, then redeploy.
      </span>
    </div>
  );
}
