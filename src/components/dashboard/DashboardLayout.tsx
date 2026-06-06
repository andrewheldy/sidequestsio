import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export interface DashNavItem {
  to: string;
  label: string;
  end?: boolean;
}

interface DashboardLayoutProps {
  title: string;
  nav: DashNavItem[];
  children: ReactNode;
}

/** Shared portal shell for partner & admin areas (wider, table-friendly). */
export default function DashboardLayout({ title, nav, children }: DashboardLayoutProps) {
  const { user, role } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/app" className="text-muted-foreground hover:text-foreground" aria-label="Back to app">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <span className="font-poppins text-lg font-bold text-foreground">{title}</span>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize text-muted-foreground">
            {user?.display_name} · {role}
          </span>
        </div>
        <nav className="mx-auto max-w-5xl overflow-x-auto px-4">
          <div className="flex gap-1 pb-2">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="glass-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-poppins text-2xl font-bold text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
