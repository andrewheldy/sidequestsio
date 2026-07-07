import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { getCookieConsent, setCookieConsent, type CookieConsent } from "@/lib/cookieConsent";

interface CookieConsentContextValue {
  consent: CookieConsent;
  /** False until the user has made an explicit choice — drives the banner's visibility. */
  hasDecided: boolean;
  acceptAll: () => void;
  acceptNecessaryOnly: () => void;
  updateConsent: (
    patch: Partial<Pick<CookieConsent, "analytics" | "marketing" | "preferences">>,
  ) => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(undefined);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsentState] = useState<CookieConsent>(() => getCookieConsent());

  const updateConsent = useCallback<CookieConsentContextValue["updateConsent"]>((patch) => {
    setConsentState(setCookieConsent(patch));
  }, []);

  const acceptAll = useCallback(() => {
    updateConsent({ analytics: true, marketing: true, preferences: true });
  }, [updateConsent]);

  const acceptNecessaryOnly = useCallback(() => {
    updateConsent({ analytics: false, marketing: false, preferences: false });
  }, [updateConsent]);

  const value: CookieConsentContextValue = {
    consent,
    hasDecided: consent.decidedAt !== null,
    acceptAll,
    acceptNecessaryOnly,
    updateConsent,
  };

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error("useCookieConsent must be used within a CookieConsentProvider");
  return ctx;
}
