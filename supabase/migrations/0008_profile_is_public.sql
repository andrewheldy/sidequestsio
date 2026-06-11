-- Add is_public flag to public.profiles.
-- This is the canonical source of truth for profile visibility used by the UI toggle.

alter table public.profiles
  add column if not exists is_public boolean not null default false;
