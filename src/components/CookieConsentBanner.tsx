import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/contexts/CookieConsentContext";

export function CookieConsentBanner() {
  const { hasDecided, acceptAll, acceptNecessaryOnly } = useCookieConsent();

  if (hasDecided) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm">
      <div className="container flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Cookie className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
          <span>
            We use necessary cookies to run SideQuests. Read our{" "}
            <Link to="/cookies" className="underline underline-offset-2 hover:text-foreground">
              Cookie Policy
            </Link>{" "}
            or customize your choices.
          </span>
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/cookie-preferences">Customize</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={acceptNecessaryOnly}>
            Necessary only
          </Button>
          <Button size="sm" onClick={acceptAll}>
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CookieConsentBanner;
