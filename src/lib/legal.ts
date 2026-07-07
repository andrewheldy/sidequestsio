/**
 * Version stamps recorded on `profiles` when a user accepts the Terms of
 * Service / Privacy Policy at signup (see supabase/migrations/0015_legal_consent.sql
 * and handle_new_auth_user()). Bump these in lockstep with the "Version:"
 * header in docs/legal/Terms-of-Service.md / docs/legal/Privacy-Policy.md —
 * see docs/legal/README.md "How consent versions map to the database".
 */
export const CURRENT_TERMS_VERSION = "1.0.0";
export const CURRENT_PRIVACY_VERSION = "1.0.0";
