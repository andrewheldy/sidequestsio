import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/types/db";

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

/** Requires an authenticated user; otherwise routes to /auth with a return path. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }
  return <>{children}</>;
}

/** Requires one of the given roles (RBAC for partner/admin areas). */
export function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }
  if (!roles.includes(role)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <h1 className="font-poppins text-2xl font-bold text-foreground">
          Access restricted
        </h1>
        <p className="max-w-sm text-muted-foreground">
          Your account ({role}) doesn't have permission to view this area.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
