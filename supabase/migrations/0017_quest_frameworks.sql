-- 0017_quest_frameworks.sql — quests generated on the spot from curated frameworks
--
-- Product decision 2026-09-27 (docs/product/PRODUCT_DECISION_LOG.md): quests may
-- be generated per user at the moment they open a quest, but ONLY from
-- curator-written frameworks, ONLY at partner venues, and a user may earn again
-- at a venue after a cooldown. No AI is involved: generation fills template
-- slots with curator-approved options, inside Postgres.
--
-- Model
--   quests            unchanged container: partner, venue, QR codes, verification.
--                     + repeat_cooldown_days (NULL = once ever, today's rule).
--   quest_frameworks  curator templates attached to a quest: objective/prompt/
--                     staff-phrase/share templates with {slot} tokens, a slots
--                     object of approved options, optional reward overrides.
--   quest_instances   one generated objective per user visit. Stable while open
--                     (refreshing the page does not re-roll it), expires after
--                     24h, and fixes the rewards the completion will pay.
--
-- Rotation: generate_quest_instance() prefers a framework different from the
-- user's previous instance at that quest, and with a single framework re-draws
-- slot values (up to 5 tries) so two visits in a row differ where possible.
--
-- complete_quest() gains p_instance_id (default NULL, so existing callers keep
-- working), enforces the repeat rule, and serialises per user+quest with an
-- advisory lock in place of the unique (user_id, quest_id) constraint, which
-- repeatable quests cannot keep. Each instance still completes at most once.
--
-- Depends on 0016_rls_hardening.sql (complete_quest below is 0016's body plus
-- the 0017 changes). Idempotent; runs in one transaction.
--
-- Before applying (after 0016, and after a backup):
--   -- Must return 0 rows, or a live duplicate already breaks the old rule:
--   select user_id, quest_id, count(*) from public.quest_completions
--    group by 1, 2 having count(*) > 1;

begin;

-- ===========================================================================
-- 1. Repeat rule on quests
-- ===========================================================================
alter table public.quests
  add column if not exists repeat_cooldown_days integer;

alter table public.quests drop constraint if exists quests_repeat_cooldown_days_positive;
alter table public.quests add constraint quests_repeat_cooldown_days_positive
  check (repeat_cooldown_days is null or repeat_cooldown_days > 0);

comment on column public.quests.repeat_cooldown_days is
  'NULL = a user completes this quest once, ever. N = a user may complete it again N days after their last completion (used with generated quests).';

-- ===========================================================================
-- 2. Frameworks (curator-authored templates)
-- ===========================================================================
create table if not exists public.quest_frameworks (
  id                    uuid primary key default gen_random_uuid(),
  quest_id              uuid not null references public.quests (id) on delete cascade,
  name                  text not null,           -- internal label, e.g. 'Secret menu hunt'
  action_type           text,
  objective_template    text not null,           -- rendered into the objective headline
  prompt_template       text,                    -- full instructions
  proof_method          text,                    -- camera|photo|staff_phrase|breadcrumb|qr|manual
  staff_phrase_template text,
  share_template        text,
  estimated_time        text,
  slots                 jsonb not null default '{}'::jsonb,  -- { "slot": ["option", ...] }
  xp_reward             integer check (xp_reward is null or xp_reward >= 0),
  points_reward         integer check (points_reward is null or points_reward >= 0),
  status                entity_status not null default 'active',
  created_at            timestamptz not null default now()
);

create index if not exists idx_quest_frameworks_quest on public.quest_frameworks (quest_id, status);

comment on table public.quest_frameworks is
  'Curated templates a quest''s objective is generated from. {slot} tokens in the templates are filled from the slots object. Validated on write by validate_quest_framework().';

-- Reject frameworks that could render broken text: every {token} used in a
-- template must be a slot with at least one non-blank string option.
create or replace function public.validate_quest_framework() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_key text; v_opts jsonb; v_token text;
begin
  if jsonb_typeof(new.slots) <> 'object' then
    raise exception 'quest_frameworks.slots must be a JSON object of slot -> [options]';
  end if;
  for v_key, v_opts in select key, value from jsonb_each(new.slots) loop
    if v_key !~ '^[a-z0-9_]+$' then
      raise exception 'slot name "%" must use lowercase letters, digits or _', v_key;
    end if;
    if jsonb_typeof(v_opts) <> 'array' or jsonb_array_length(v_opts) = 0 then
      raise exception 'slot "%" needs a non-empty array of options', v_key;
    end if;
    if exists (select 1 from jsonb_array_elements(v_opts) e
                where jsonb_typeof(e) <> 'string' or btrim(e #>> '{}') = '') then
      raise exception 'slot "%" options must all be non-blank strings', v_key;
    end if;
  end loop;
  for v_token in
    select (regexp_matches(
              concat_ws(' ', new.objective_template, new.prompt_template,
                             new.staff_phrase_template, new.share_template),
              '\{([a-z0-9_]+)\}', 'g'))[1]
  loop
    if not (new.slots ? v_token) then
      raise exception 'template uses {%} but slots has no "%" key', v_token, v_token;
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists quest_frameworks_validate on public.quest_frameworks;
create trigger quest_frameworks_validate
  before insert or update on public.quest_frameworks
  for each row execute function public.validate_quest_framework();

-- ===========================================================================
-- 3. Instances (one generated objective per user visit)
-- ===========================================================================
create table if not exists public.quest_instances (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users (id) on delete cascade,
  quest_id       uuid not null references public.quests (id) on delete cascade,
  framework_id   uuid references public.quest_frameworks (id) on delete set null,
  slot_values    jsonb not null default '{}'::jsonb,
  objective      text not null,
  prompt         text,
  proof_method   text,
  staff_phrase   text,
  share_prompt   text,
  estimated_time text,
  xp_reward      integer not null,
  points_reward  integer not null,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null default now() + interval '1 day',
  completed_at   timestamptz
);

create index if not exists idx_quest_instances_user_quest
  on public.quest_instances (user_id, quest_id, created_at desc);

comment on table public.quest_instances is
  'Objectives generated per user by generate_quest_instance(). Written only by RPCs; users read their own.';

-- Completions point at the instance they fulfilled (NULL for static quests).
alter table public.quest_completions
  add column if not exists instance_id uuid references public.quest_instances (id) on delete set null;

create unique index if not exists quest_completions_instance_once
  on public.quest_completions (instance_id) where instance_id is not null;

-- Repeatable quests need more than one completion per user+quest. The unique
-- constraint from 0001/0006 is dropped by definition (its name is generated);
-- complete_quest() now enforces the repeat rule under an advisory lock.
do $$
declare v_name text;
begin
  select conname into v_name
    from pg_constraint
   where conrelid = 'public.quest_completions'::regclass
     and contype = 'u'
     and pg_get_constraintdef(oid) = 'UNIQUE (user_id, quest_id)';
  if v_name is not null then
    execute format('alter table public.quest_completions drop constraint %I', v_name);
  end if;
end $$;

create index if not exists idx_completions_user_quest_time
  on public.quest_completions (user_id, quest_id, completed_at desc);

-- ===========================================================================
-- 4. RLS and grants
-- ===========================================================================
alter table public.quest_frameworks enable row level security;
alter table public.quest_instances  enable row level security;

-- Frameworks: partners manage their own quests' frameworks (partner portal);
-- players never read them directly, they receive rendered instances.
drop policy if exists quest_frameworks_manage on public.quest_frameworks;
create policy quest_frameworks_manage on public.quest_frameworks for all
  using (public.owns_partner((select q.partner_id from public.quests q where q.id = quest_id)))
  with check (public.owns_partner((select q.partner_id from public.quests q where q.id = quest_id)));

drop policy if exists quest_instances_self_read on public.quest_instances;
create policy quest_instances_self_read on public.quest_instances for select
  using (user_id = auth.uid() or public.is_admin());

revoke all on public.quest_frameworks from public, anon, authenticated;
revoke all on public.quest_instances  from public, anon, authenticated;
grant select, insert, update on public.quest_frameworks to authenticated;
grant select on public.quest_instances to authenticated;

-- ===========================================================================
-- 5. Generation
-- ===========================================================================
create or replace function public.render_quest_template(p_template text, p_values jsonb)
returns text
language plpgsql immutable set search_path = '' as $$
declare v_key text; v_val text; v_out text := p_template;
begin
  if p_template is null then return null; end if;
  for v_key, v_val in select key, value from jsonb_each_text(p_values) loop
    v_out := replace(v_out, '{' || v_key || '}', v_val);
  end loop;
  return v_out;
end $$;

-- Returns {ok:true, instance:<row>} for a generated objective,
-- {ok:true, instance:null} when the quest has no active frameworks (show the
-- static quest), or {ok:false, error, availableAt?} when the user cannot do it.
create or replace function public.generate_quest_instance(p_quest_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  q quests; f quest_frameworks;
  v_prev quest_instances; v_open quest_instances; v_inst quest_instances;
  v_last_at timestamptz; v_available_at timestamptz;
  v_slots jsonb; v_key text; v_opts jsonb; v_try integer := 0;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select * into q from quests where id = p_quest_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if q.status <> 'active' or (q.start_date is not null and now() < q.start_date) then
    return jsonb_build_object('ok', false, 'error', 'quest_inactive');
  end if;
  if q.end_date is not null and now() > q.end_date then
    return jsonb_build_object('ok', false, 'error', 'quest_expired');
  end if;

  -- Same repeat rule as complete_quest().
  select max(completed_at) into v_last_at
    from quest_completions where user_id = uid and quest_id = q.id;
  if v_last_at is not null then
    if q.repeat_cooldown_days is null then
      return jsonb_build_object('ok', false, 'error', 'already_completed');
    end if;
    v_available_at := v_last_at + make_interval(days => q.repeat_cooldown_days);
    if v_available_at > now() then
      return jsonb_build_object('ok', false, 'error', 'cooldown', 'availableAt', v_available_at);
    end if;
  end if;

  -- Serialise generation per user+quest so two tabs cannot mint two instances.
  perform pg_advisory_xact_lock(hashtextextended('gen:' || uid::text || ':' || q.id::text, 0));

  -- An open instance is reused: the objective must not change on refresh.
  select * into v_open from quest_instances
   where user_id = uid and quest_id = q.id and completed_at is null and expires_at > now()
   order by created_at desc limit 1;
  if found then return jsonb_build_object('ok', true, 'instance', to_jsonb(v_open)); end if;

  select * into v_prev from quest_instances
   where user_id = uid and quest_id = q.id
   order by created_at desc limit 1;

  -- Prefer any framework other than last time's; random among the rest.
  select * into f from quest_frameworks
   where quest_id = q.id and status = 'active'
   order by (id is not distinct from v_prev.framework_id), random()
   limit 1;
  if not found then return jsonb_build_object('ok', true, 'instance', null); end if;

  loop
    v_slots := '{}'::jsonb;
    for v_key, v_opts in select key, value from jsonb_each(f.slots) loop
      v_slots := v_slots || jsonb_build_object(
        v_key, v_opts ->> floor(random() * jsonb_array_length(v_opts))::int);
    end loop;
    v_try := v_try + 1;
    exit when v_prev.id is null
           or f.id is distinct from v_prev.framework_id
           or v_slots is distinct from v_prev.slot_values
           or v_try >= 5;
  end loop;

  insert into quest_instances (
    user_id, quest_id, framework_id, slot_values,
    objective, prompt, proof_method, staff_phrase, share_prompt, estimated_time,
    xp_reward, points_reward
  ) values (
    uid, q.id, f.id, v_slots,
    public.render_quest_template(f.objective_template, v_slots),
    coalesce(public.render_quest_template(f.prompt_template, v_slots), q.action_prompt),
    coalesce(f.proof_method, q.proof_method),
    coalesce(public.render_quest_template(f.staff_phrase_template, v_slots), q.staff_phrase),
    coalesce(public.render_quest_template(f.share_template, v_slots), q.social_share_prompt),
    coalesce(f.estimated_time, q.estimated_time),
    coalesce(f.xp_reward, q.xp_reward),
    coalesce(f.points_reward, q.points_reward)
  ) returning * into v_inst;

  return jsonb_build_object('ok', true, 'instance', to_jsonb(v_inst));
end $$;

-- ===========================================================================
-- 6. Completion
-- ===========================================================================
-- Adding a defaulted parameter would create an overload that PostgREST cannot
-- choose between, so the 4-argument version is dropped first. Existing callers
-- that send four named arguments resolve to the new function unchanged.
drop function if exists public.complete_quest(uuid, verification_type, text, uuid);

-- 0016's complete_quest plus: p_instance_id, the repeat rule, instance rewards.
create or replace function public.complete_quest(
  p_quest_id uuid,
  p_verification_method verification_type,
  p_venue_code text,
  p_source_scan_id uuid,
  p_instance_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  q quests; uid uuid := auth.uid();
  v_completion quest_completions; v_profile user_profiles;
  prev_level integer; new_level integer; verified boolean;
  v_secret text;
  v_last_at timestamptz; v_available_at timestamptz;
  v_inst quest_instances; v_xp integer; v_points integer;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select * into q from quests where id = p_quest_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  -- 0017: serialise completions per user+quest (replaces the dropped
  -- unique (user_id, quest_id) as the double-submit guard), then apply the
  -- quest's repeat rule: NULL cooldown = once ever, N = again after N days.
  perform pg_advisory_xact_lock(hashtextextended(uid::text || ':' || q.id::text, 0));
  select max(completed_at) into v_last_at
    from quest_completions where user_id = uid and quest_id = q.id;
  if v_last_at is not null then
    if q.repeat_cooldown_days is null then
      return jsonb_build_object('ok', false, 'error', 'already_completed');
    end if;
    v_available_at := v_last_at + make_interval(days => q.repeat_cooldown_days);
    if v_available_at > now() then
      return jsonb_build_object('ok', false, 'error', 'cooldown', 'availableAt', v_available_at);
    end if;
  end if;
  if q.status <> 'active' or (q.start_date is not null and now() < q.start_date) then
    return jsonb_build_object('ok', false, 'error', 'quest_inactive');
  end if;
  if q.end_date is not null and now() > q.end_date then
    return jsonb_build_object('ok', false, 'error', 'quest_expired');
  end if;

  -- 0017: a generated instance (if any) fixes this completion's rewards.
  v_xp := q.xp_reward; v_points := q.points_reward;
  if p_instance_id is not null then
    select * into v_inst from quest_instances
     where id = p_instance_id and user_id = uid and quest_id = q.id and completed_at is null
     for update;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'instance_invalid');
    end if;
    v_xp := v_inst.xp_reward; v_points := v_inst.points_reward;
  end if;

  -- 0016: the venue code now lives in quest_secrets (was quests.verification_secret).
  if q.verification_type = 'venue_code' then
    select s.verification_secret into v_secret from quest_secrets s where s.quest_id = q.id;
  end if;
  verified := case q.verification_type
    when 'venue_code' then (p_venue_code is not null and v_secret is not null
                            and upper(trim(p_venue_code)) = upper(v_secret))
    else true end;
  if not verified then
    update quest_attempts set status='failed', failure_reason='verification_failed',
           verification_method=p_verification_method
     where user_id=uid and quest_id=q.id and status='in_progress';
    return jsonb_build_object('ok', false, 'error', 'verification_failed');
  end if;

  insert into quest_completions(user_id, quest_id, venue_id, partner_id,
                                xp_awarded, points_awarded, source_scan_id, instance_id)
  values (uid, q.id, q.venue_id, q.partner_id, v_xp, v_points, p_source_scan_id, v_inst.id)
  returning * into v_completion;

  if v_inst.id is not null then
    update quest_instances set completed_at = now() where id = v_inst.id;
  end if;

  insert into points_ledger(user_id, transaction_type, source, points_amount,
                            xp_amount, quest_id, partner_id, metadata)
  values (uid, 'earn', 'quest_completion', v_points, v_xp, q.id, q.partner_id,
          jsonb_build_object('verification', p_verification_method, 'instance_id', v_inst.id));

  update quest_attempts set status='completed', completed_at=now(),
         verification_method=p_verification_method
   where user_id=uid and quest_id=q.id and status='in_progress';

  if p_source_scan_id is not null then
    update scan_events set conversion_state='completed' where id = p_source_scan_id;
  end if;

  select * into v_profile from user_profiles where user_id = uid for update;
  prev_level := v_profile.level;
  new_level := level_for_xp(v_profile.xp + v_xp);
  update user_profiles set
    xp = xp + v_xp,
    points_balance_cache = points_balance_cache + v_points,
    lifetime_points = lifetime_points + v_points,
    completed_quests_count = completed_quests_count + 1,
    level = new_level
  where user_id = uid;

  insert into audit_logs(actor_id, action, entity_type, entity_id)
  values (uid, 'quest.completed', 'quest', q.id::text);

  return jsonb_build_object(
    'ok', true,
    'completion', to_jsonb(v_completion),
    'xpAwarded', v_xp,
    'pointsAwarded', v_points,
    'newLevel', new_level,
    'leveledUp', new_level > prev_level,
    'instanceId', v_inst.id
  );
end $$;

commit;

-- Verification (run after applying):
--   select count(*) from pg_constraint
--    where conrelid = 'public.quest_completions'::regclass
--      and pg_get_constraintdef(oid) = 'UNIQUE (user_id, quest_id)';          -- 0
--   select pg_get_function_identity_arguments('public.complete_quest'::regproc); -- 5 args
--   select has_table_privilege('anon', 'public.quest_instances', 'SELECT');    -- false
--   Then author one framework (docs/product/QUEST_DESIGN_GUIDE.md, "Quest
--   frameworks"), set the quest's repeat_cooldown_days, open it signed in, and
--   check the objective differs on the next visit after the cooldown.
--
-- Rollback (only while no user has two completions of the same quest):
--   begin;
--   -- re-run complete_quest from 0016_rls_hardening.sql after:
--   drop function if exists public.complete_quest(uuid, verification_type, text, uuid, uuid);
--   drop function if exists public.generate_quest_instance(uuid);
--   drop function if exists public.render_quest_template(text, jsonb);
--   drop index if exists public.quest_completions_instance_once;
--   alter table public.quest_completions drop column if exists instance_id;
--   alter table public.quest_completions add constraint quest_completions_user_id_quest_id_key
--     unique (user_id, quest_id);
--   drop table if exists public.quest_instances;
--   drop table if exists public.quest_frameworks;
--   drop function if exists public.validate_quest_framework();
--   alter table public.quests drop column if exists repeat_cooldown_days;
--   commit;
