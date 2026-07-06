/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL. When unset, the app uses the in-browser LocalRepository. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon (public) key. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Mapbox public token used by the interactive quest map. */
  readonly VITE_MAPBOX_PUBLIC_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
