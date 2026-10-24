// Background task definitions must exist at module scope before the router
// mounts, so a geofence event can be handled with no UI running.
import './src/lib/adventure/geofenceTask';
import 'expo-router/entry';
