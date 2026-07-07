import type { ReactNode } from "react";
import BottomNav from "./BottomNav";
import AppHeader from "./AppHeader";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  /** Hide the default header when a page renders its own hero. */
  hideHeader?: boolean;
}

/**
 * Mobile-first app shell: a centered max-width column with a sticky bottom nav.
 * Kept separate from the marketing `Layout` so the two never interfere.
 *
 * @deprecated Do NOT use inside the /app route shell (src/pages/app/AppLayout.tsx)
 * — that shell already provides the column and BottomNav, and nesting this
 * wrapper doubles both. Mounted pages render <AppHeader /> + content directly.
 * Only the currently-unmounted pages (Wallet, Rewards, Leaderboard, History,
 * AppHome) still use this; migrate them the same way if/when they mount.
 */
export default function AppLayout({
  children,
  title,
  subtitle,
  hideHeader,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md px-4 pb-28">
        {!hideHeader && <AppHeader title={title} subtitle={subtitle} />}
        <main className="mt-4">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
