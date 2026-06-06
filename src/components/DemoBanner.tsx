import { isDemoMode } from "@/lib/demo";
import { Info } from "lucide-react";

export function DemoBanner() {
  if (!isDemoMode) return null;
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500/90 px-4 py-2 text-center text-xs font-medium text-amber-950 backdrop-blur-sm">
      <Info className="h-3.5 w-3.5 shrink-0" />
      <span>Demo Mode — Data shown is sample content while backend integration is being completed.</span>
    </div>
  );
}
