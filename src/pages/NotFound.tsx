import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { NoQuestFound } from "@/components/app/NoQuestFound";

/** App-wide 404: the same "no quest found" doorway as a missing quest. */
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="dark flex min-h-screen flex-col bg-midnight-950 bg-[radial-gradient(60rem_40rem_at_50%_-10%,hsl(var(--ocean-500)/0.10),transparent_70%)] text-sand-50">
      <header className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Link to="/" aria-label="sidequests home" className="inline-flex">
          <Logo tone="reverse" size="sm" decorative />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center py-10">
        <NoQuestFound />
      </main>
    </div>
  );
};

export default NotFound;
