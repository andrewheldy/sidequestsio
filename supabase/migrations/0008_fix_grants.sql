-- Grant table-level privileges on public.profiles to authenticated users.
-- The RLS policies already exist (0001_profiles.sql) but table-level GRANTs
-- were never issued, causing PostgREST to reject client-side UPDATE calls with
-- "permission denied for table profiles" during onboarding completion.
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Fix missing INSERT policy on user_profiles.
-- 0002_rls.sql / 0007_rls_idempotent.sql only created SELECT + UPDATE policies.
-- Without INSERT, any direct client INSERT into user_profiles would fail.
DROP POLICY IF EXISTS profiles_self_insert ON public.user_profiles;
CREATE POLICY profiles_self_insert ON public.user_profiles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
