/**
 * Consent version stamps sent with signup metadata and recorded by
 * handle_new_auth_user() (supabase/migrations/0015_legal_consent.sql).
 * Must match the website's src/lib/legal.ts and the "Version:" headers in
 * docs/legal/Terms-of-Service.md / Privacy-Policy.md. Bump all together.
 */
export const CURRENT_TERMS_VERSION = '1.1.0';
export const CURRENT_PRIVACY_VERSION = '1.1.0';
