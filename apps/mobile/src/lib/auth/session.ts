// Mobile sign-in is not built yet (docs/product/LOCATION_DISCOVERY.md §10).
// Everything that needs a signed-in user asks this seam, so wiring the existing
// Supabase Auth later is one change. Until then there is never a session, and
// Adventure / GPS check-in show "Sign in required".
export type Session = { userId: string; accessToken: string };

type Provider = () => Promise<Session | null>;
type Listener = (session: Session | null) => void;

let provider: Provider = async () => null;
const listeners = new Set<Listener>();

export function setSessionProvider(next: Provider) {
  provider = next;
}

export async function getSession(): Promise<Session | null> {
  try {
    return await provider();
  } catch {
    return null;
  }
}

/** The auth layer calls this on sign-in, sign-out and account switch. */
export function notifySessionChanged(session: Session | null) {
  listeners.forEach((listener) => listener(session));
}

export function onSessionChanged(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
