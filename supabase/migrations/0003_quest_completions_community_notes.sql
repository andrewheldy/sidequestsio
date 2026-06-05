-- =============================================================================
-- 0003_quest_completions_community_notes.sql
-- Quest completion tracking (with verification + duplicate prevention) and the
-- community notes system (moderation + reporting).
--
-- Depends on 0002 (quests, qr_codes, owns_quest/is_admin helpers) and
-- 0001 (profiles, set_updated_at).
-- Idempotent: safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Quest completions
--   * one row per (quest, user) → prevents duplicate completions
--   * verification tracked via method + verifier + timestamp
-- -----------------------------------------------------------------------------
create table if not exists public.quest_completions (
  id                  uuid primary key default gen_random_uuid(),
  quest_id            uuid not null references public.quests (id) on delete cascade,
  user_id             uuid not null references public.profiles (user_id) on delete cascade,
  status              text not null default 'pending'
                        check (status in ('pending', 'verified', 'rejected')),
  verification_method text not null default 'none'
                        check (verification_method in ('none', 'qr', 'geo', 'manual')),
  qr_code_id          uuid references public.qr_codes (id) on delete set null,
  verified_by         uuid references public.profiles (user_id) on delete set null,
  verified_at         timestamptz,
  xp_awarded          integer not null default 0 check (xp_awarded >= 0),
  points_awarded      integer not null default 0 check (points_awarded >= 0),
  note                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint quest_completions_unique_per_user unique (quest_id, user_id)
);

-- -----------------------------------------------------------------------------
-- Community notes
-- -----------------------------------------------------------------------------
create table if not exists public.community_notes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (user_id) on delete cascade,
  quest_id          uuid references public.quests (id) on delete set null,
  venue_id          uuid references public.venues (id) on delete set null,
  body              text not null check (char_length(body) between 1 and 2000),
  photo_url         text,
  status            text not null default 'visible'
                      check (status in ('visible', 'pending', 'hidden', 'removed')),
  is_flagged        boolean not null default false,
  flag_count        integer not null default 0,
  moderated_by      uuid references public.profiles (user_id) on delete set null,
  moderated_at      timestamptz,
  moderation_reason text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Note reports (one report per user per note)
-- -----------------------------------------------------------------------------
create table if not exists public.note_reports (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid not null references public.community_notes (id) on delete cascade,
  reporter_id uuid not null references public.profiles (user_id) on delete cascade,
  reason      text not null
                check (reason in ('spam', 'inappropriate', 'inaccurate', 'offensive', 'other')),
  details     text,
  status      text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  reviewed_by uuid references public.profiles (user_id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  constraint note_reports_unique_per_user unique (note_id, reporter_id)
);

-- -----------------------------------------------------------------------------
-- Keep community_notes.flag_count / is_flagged in sync with note_reports.
-- SECURITY DEFINER so it can update the note row regardless of the reporter's
-- RLS on community_notes.
-- -----------------------------------------------------------------------------
create or replace function public.sync_note_flag_count()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.community_notes n
  set flag_count = (select count(*) from public.note_reports r where r.note_id = n.id),
      is_flagged = (select count(*) from public.note_reports r where r.note_id = n.id) > 0
  where n.id = coalesce(new.note_id, old.note_id);
  return null;
end;
$$;

drop trigger if exists note_reports_sync_flags on public.note_reports;
create trigger note_reports_sync_flags
  after insert or delete on public.note_reports
  for each row execute function public.sync_note_flag_count();

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.quest_completions enable row level security;
alter table public.community_notes   enable row level security;
alter table public.note_reports      enable row level security;

-- quest_completions: a user sees & files their own; the owning host/admin sees
-- and verifies completions for their quests.
drop policy if exists "users read their completions" on public.quest_completions;
create policy "users read their completions" on public.quest_completions
  for select using (user_id = auth.uid() or public.owns_quest(quest_id));
-- Players may only file an *unverified, zero-award* completion (e.g. a manual
-- "I did this" pending host review). Verified QR completions and all XP/points
-- awards go exclusively through SECURITY DEFINER RPCs (migration 0006), so a
-- user cannot self-verify or self-award.
drop policy if exists "users create their completions" on public.quest_completions;
create policy "users create their completions" on public.quest_completions
  for insert with check (
    user_id = auth.uid()
    and status = 'pending'
    and xp_awarded = 0
    and points_awarded = 0
    and verification_method in ('none', 'manual', 'geo')
  );
drop policy if exists "hosts verify completions" on public.quest_completions;
create policy "hosts verify completions" on public.quest_completions
  for update using (public.owns_quest(quest_id))
  with check (public.owns_quest(quest_id));
drop policy if exists "users or hosts delete completions" on public.quest_completions;
create policy "users or hosts delete completions" on public.quest_completions
  for delete using (user_id = auth.uid() or public.owns_quest(quest_id));

-- community_notes: visible notes are public; authors, the quest host and admins
-- can also see non-visible ones.
drop policy if exists "visible notes are public" on public.community_notes;
create policy "visible notes are public" on public.community_notes
  for select using (
    status = 'visible'
    or user_id = auth.uid()
    or public.is_admin()
    or public.owns_quest(quest_id)
  );
-- A note about a quest requires a VERIFIED completion of that quest by the
-- author (anti-spam / proof-of-visit). Venue-only notes (no quest_id) are
-- allowed without a completion.
drop policy if exists "users create their notes" on public.community_notes;
create policy "users create their notes" on public.community_notes
  for insert with check (
    user_id = auth.uid()
    and (
      community_notes.quest_id is null
      or exists (
        select 1 from public.quest_completions c
        where c.quest_id = community_notes.quest_id
          and c.user_id = auth.uid()
          and c.status = 'verified'
      )
    )
  );
drop policy if exists "authors or moderators update notes" on public.community_notes;
create policy "authors or moderators update notes" on public.community_notes
  for update using (user_id = auth.uid() or public.is_admin() or public.owns_quest(quest_id))
  with check (user_id = auth.uid() or public.is_admin() or public.owns_quest(quest_id));
drop policy if exists "authors or admins delete notes" on public.community_notes;
create policy "authors or admins delete notes" on public.community_notes
  for delete using (user_id = auth.uid() or public.is_admin());

-- note_reports: a user files & reads their own reports; admins read & resolve.
drop policy if exists "users file reports" on public.note_reports;
create policy "users file reports" on public.note_reports
  for insert with check (reporter_id = auth.uid());
drop policy if exists "reporters and admins read reports" on public.note_reports;
create policy "reporters and admins read reports" on public.note_reports
  for select using (reporter_id = auth.uid() or public.is_admin());
drop policy if exists "admins resolve reports" on public.note_reports;
create policy "admins resolve reports" on public.note_reports
  for update using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- Indexes
-- =============================================================================
create index if not exists quest_completions_quest_idx  on public.quest_completions (quest_id);
create index if not exists quest_completions_user_idx   on public.quest_completions (user_id);
create index if not exists quest_completions_status_idx on public.quest_completions (status);
create index if not exists quest_completions_user_status_idx on public.quest_completions (user_id, status);
create index if not exists community_notes_quest_idx    on public.community_notes (quest_id);
create index if not exists community_notes_venue_idx    on public.community_notes (venue_id);
create index if not exists community_notes_user_idx     on public.community_notes (user_id);
create index if not exists community_notes_status_idx   on public.community_notes (status);
-- Quest note feed: visible notes for a quest, newest first.
create index if not exists community_notes_quest_feed_idx
  on public.community_notes (quest_id, created_at desc) where status = 'visible';
create index if not exists note_reports_note_idx        on public.note_reports (note_id);
create index if not exists note_reports_reporter_idx    on public.note_reports (reporter_id);
create index if not exists note_reports_status_idx      on public.note_reports (status);

-- =============================================================================
-- updated_at triggers
-- =============================================================================
drop trigger if exists quest_completions_set_updated_at on public.quest_completions;
create trigger quest_completions_set_updated_at before update on public.quest_completions
  for each row execute function public.set_updated_at();

drop trigger if exists community_notes_set_updated_at on public.community_notes;
create trigger community_notes_set_updated_at before update on public.community_notes
  for each row execute function public.set_updated_at();
