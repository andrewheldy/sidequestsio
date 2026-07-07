/**
 * Client-side cookie consent state (see docs/legal/Cookie-Policy.md). Stored
 * in localStorage only — this is separate from the account-level
 * privacy_preferences/consent_events tables used for signed-in data-use
 * consent (analytics/marketing/location), which cover a different concern.
 *
 * `hasAnalyticsConsent()` / `hasMarketingConsent()` are the API future tools
 * (e.g. a product analytics SDK) should check before initializing. No such
 * tool is wired up today — see docs/legal/Cookie-Policy.md §3.
 */

export interface CookieConsent {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  /** Null until the user has made an explicit choice (banner or preferences page). */
  decidedAt: string | null;
}

const STORAGE_KEY = "sidequests-cookie-consent";

const DEFAULT_CONSENT: CookieConsent = {
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: false,
  decidedAt: null,
};

export function getCookieConsent(): CookieConsent {
  if (typeof window === "undefined") return DEFAULT_CONSENT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONSENT;
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    return { ...DEFAULT_CONSENT, ...parsed, necessary: true };
  } catch {
    return DEFAULT_CONSENT;
  }
}

export function setCookieConsent(
  patch: Partial<Pick<CookieConsent, "analytics" | "marketing" | "preferences">>,
): CookieConsent {
  const next: CookieConsent = {
    ...getCookieConsent(),
    ...patch,
    necessary: true,
    decidedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function hasAnalyticsConsent(): boolean {
  return getCookieConsent().analytics;
}

export function hasMarketingConsent(): boolean {
  return getCookieConsent().marketing;
}
