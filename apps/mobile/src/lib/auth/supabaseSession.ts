import type { Session as SupabaseSession } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { notifySessionChanged, setSessionProvider, type Session } from './session';

// Feeds the session seam (./session.ts) from the app's Supabase Auth client, so
// discovery, GPS check-in and Adventure see the same signed-in user as the rest
// of the app. Imported from index.ts so background tasks get it with no UI.

function toSession(session: SupabaseSession | null): Session | null {
  return session ? { userId: session.user.id, accessToken: session.access_token } : null;
}

if (supabase) {
  const client = supabase;
  setSessionProvider(async () => toSession((await client.auth.getSession()).data.session));
  client.auth.onAuthStateChange((_event, session) => notifySessionChanged(toSession(session)));
}
