// Background task definitions must exist at module scope before the router
// mounts, so a geofence event can be handled with no UI running. The session
// seam is wired first so those tasks see the signed-in user.
import './src/lib/auth/supabaseSession';
import './src/lib/adventure/geofenceTask';
import 'expo-router/entry';
