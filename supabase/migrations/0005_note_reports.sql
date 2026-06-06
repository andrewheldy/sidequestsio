-- =============================================================================
-- 0005_note_reports.sql
-- Crowd-sourced abuse reporting for community notes.
--
-- main already ships author/moderator moderation via community_notes.
-- moderation_status (enum: pending|approved|rejected|flagged), but there is no
-- way for ordinary users to *report* a note. This migration adds that end-user
-- reporting flow, ported onto main's schema conventions:
--   * user references point at users(id) (auth.uid() maps 1:1 to users.id)
--   * RLS helpers is_admin() (from 0002_rls.sql)
--   * surfaces reported notes into main's existing 'flagged' moderation_status
--     once a report threshold is crossed, so they appear in the moderation queue
--
-- Depends on 0001_schema.sql (users, community_notes, moderation_status) and
-- 0002_rls.sql (is_admin). Idempotent: safe to re-run.
-- =============================================================================

-- A running flag tally on the note (additive column; main had none).
alter table public.community_notes
  add column if not exists flag_count integer not null default 0;

-- -----------------------------------------------------------------------------
-- note_reports: one report per user per note.
-- -----------------------------------------------------------------------------
create table if not exists public.note_reports (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid not null references public.community_notes (id) on delete cascade,
  reporter_id uuid not null references public.users (id) on delete cascade,
  reason      text not null
                check (reason in ('spam', 'inappropriate', 'inaccurate', 'offensive', 'other')),
  details     text,
  status      text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  reviewed_by uuid references public.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  constraint note_reports_unique_per_user unique (note_id, reporter_id)
);

create index if not exists note_reports_note_idx     on public.note_reports (note_id);
create index if not exists note_reports_reporter_idx on public.note_reports (reporter_id);
create index if not exists note_reports_status_idx   on public.note_reports (status);

-- -----------------------------------------------------------------------------
-- Keep community_notes.flag_count in sync with note_reports, and once a note
-- accumulates enough independent reports, surface it for moderation by moving
-- an otherwise-'approved' note into main's 'flagged' status. We never override
-- an explicit 'pending'/'rejected' decision, and a single report can't hide a
-- note (threshold = 3), which avoids weaponising reports as censorship.
-- SECURITY DEFINER so it can update the note row regardless of the reporter's
-- RLS on community_notes.
-- -----------------------------------------------------------------------------
create or replace function public.sync_note_flag_count()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_note_id uuid := coalesce(new.note_id, old.note_id);
  v_count   integer;
begin
  select count(*) into v_count from public.note_reports where note_id = v_note_id;

  update public.community_notes
     set flag_count = v_count,
         moderation_status = case
           when v_count >= 3 and moderation_status = 'approved' then 'flagged'::moderation_status
           else moderation_status
         end
   where id = v_note_id;

  return null;
end;
$$;

drop trigger if exists note_reports_sync_flags on public.note_reports;
create trigger note_reports_sync_flags
  after insert or delete on public.note_reports
  for each row execute function public.sync_note_flag_count();

-- =============================================================================
-- Row Level Security (mirrors main's policy style in 0002_rls.sql)
-- =============================================================================
alter table public.note_reports enable row level security;

-- A user files reports as themselves.
drop policy if exists note_reports_file on public.note_reports;
create policy note_reports_file on public.note_reports
  for insert with check (reporter_id = auth.uid());

-- Reporters see their own reports; admins see all.
drop policy if exists note_reports_read on public.note_reports;
create policy note_reports_read on public.note_reports
  for select using (reporter_id = auth.uid() or public.is_admin());

-- Only admins resolve reports.
drop policy if exists note_reports_resolve on public.note_reports;
create policy note_reports_resolve on public.note_reports
  for update using (public.is_admin()) with check (public.is_admin());
