// The session seam for discovery, GPS check-in and Adventure. Everything that
// needs a signed-in user asks here; ./supabaseSession.ts wires it to Supabase
// Auth. With no backend configured there is never a session, and Adventure /
// GPS check-in show "Sign in required".
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
