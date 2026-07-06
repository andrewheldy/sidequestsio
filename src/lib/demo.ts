/**
 * Demo mode is tied to the Vite dev build flag, never to an env var, so it
 * cannot be switched on in a production build regardless of what's set in
 * Vercel's environment variables.
 */
export const isDemoMode = import.meta.env.DEV;
