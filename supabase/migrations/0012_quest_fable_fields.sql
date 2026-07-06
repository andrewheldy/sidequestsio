-- 0012_quest_fable_fields.sql — Fable quest fields: capture drift + add action_prompt
--
-- WHY (verified live 2026-07-06): the live quests table ALREADY has seven
-- Fable columns plus links (applied ad hoc, ahead of the repo — no checked-in
-- migration creates them), but is missing action_prompt, which the frontend
-- types expect (src/types/db.ts:173) and QuestDetail renders. This migration
-- (a) adds the one genuinely missing column and (b) records the full set so a
-- fresh environment built from these migrations reproduces production.
--
-- Types mirror the live columns exactly (all text; links jsonb). Values are
-- authored content, populated separately (supabase/content/, task T-CONTENT-1).
-- Idempotent; every clause is a no-op where the column already exists.

alter table public.quests
  add column if not exists funky_action        text,
  add column if not exists action_type         text,
  add column if not exists action_prompt       text,
  add column if not exists proof_method        text,
  add column if not exists staff_phrase        text,
  add column if not exists social_share_prompt text,
  add column if not exists estimated_time      text,
  add column if not exists links               jsonb;

comment on column public.quests.funky_action        is 'The memorable real-world action headline shown on the quest page';
comment on column public.quests.action_type         is 'Category of action (frontend ActionType union; free text by design at MVP)';
comment on column public.quests.action_prompt       is 'Full instructions for performing the action';
comment on column public.quests.proof_method        is 'How completion is evidenced: camera|photo|staff_phrase|breadcrumb|qr|manual';
comment on column public.quests.staff_phrase        is 'Phrase the user tells staff (staff_phrase proof method)';
comment on column public.quests.social_share_prompt is 'Suggested share caption after completion';
comment on column public.quests.estimated_time      is 'Human-readable time estimate, e.g. "10–15 min"';
comment on column public.quests.links               is 'Business links JSON: menu_url, google_reviews_url, special_deals, socials…';

-- Verification:
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='quests'
--      and column_name in ('funky_action','action_type','action_prompt','proof_method',
--                          'staff_phrase','social_share_prompt','estimated_time','links');
--   -- 8 rows expected.
