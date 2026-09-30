-- 0018_scan_verification.sql — QR/NFC quests require a real scan; NFC tags as venue codes
--
-- WHY (verified live 2026-09-28): complete_quest() only checks venue codes, so
-- for every QR quest verification always passes. Opening a quest page also
-- records a "scan", so a signed-in user can complete any QR quest without
-- visiting. And every active code is publicly readable (qr_public_read + the
-- 0009 anon grant), so knowing a code proves nothing. Live: 9 active quests,
-- all QR, one code each; no scan has ever been recorded and there is one
-- completion, so enforcing this now disrupts nobody.
--
-- What changes
--   1. qr_codes.kind ('qr' | 'nfc'): an NFC sticker is a venue code like a QR
--      sticker. Both encode https://<site>/scan/<code>. Phones open the link
--      on tap (iPhone XS+ and Android) with no app and no Web NFC.
--   2. Codes stop being public. Owners/admins still read their own; players
--      reach a code only by scanning it. destination_url is backfilled to the
--      URL that must be printed or written to a tag: /scan/<code>.
--   3. record_code_scan(p_code, ...) resolves a scanned code server-side and
--      records a scan with code_verified = true. record_scan() (page views,
--      direct /q/ links) keeps working but its scans are never verified.
--   4. complete_quest(): quests with verification_type 'qr' or 'nfc' need a
--      code-verified scan of one of the quest's codes, by this user or claimed
--      from their anonymous pre-sign-in scan, from the last 2 hours, not
--      already used by a completion. Otherwise error 'scan_required'. Venue
--      code, GPS and staff-approval quests are unchanged.
--   5. create_qr_code() takes p_kind (default 'qr') and sets the /scan/ URL.
--   6. record_scan() gets the enum cast it has always been missing: every call
--      has errored since 0003 (production has zero scan_events rows).
--
-- Depends on 0017_quest_frameworks.sql (complete_quest below is 0017's body
-- plus the scan check). Idempotent; one transaction.
--
-- Deploy order: ship the app first (it falls back to the old scan path until
-- record_code_scan exists), then apply this migration.

begin;

-- ===========================================================================
-- 1. Code kind
-- ===========================================================================
alter table public.qr_codes add column if not exists kind text not null default 'qr';
alter table public.qr_codes drop constraint if exists qr_codes_kind_check;
alter table public.qr_codes add constraint qr_codes_kind_check check (kind in ('qr', 'nfc'));

comment on column public.qr_codes.kind is
  'qr = printed QR sticker; nfc = NFC tag (NDEF URL record). Both encode /scan/<code> and verify the same way.';

-- ===========================================================================
-- 2. Codes are secrets
-- ===========================================================================
drop policy if exists qr_public_read on public.qr_codes;
drop policy if exists qr_owner_read on public.qr_codes;
create policy qr_owner_read on public.qr_codes for select
  using (public.owns_partner(partner_id));

-- anon never needs the table; authenticated keeps SELECT for the partner
-- portal, limited by qr_owner_read to codes the user's partner owns.
revoke select on public.qr_codes from anon;

-- The URL a sticker or tag must carry. The old '/q/<quest id>' value never
-- contained the code, so it could not prove a visit.
update public.qr_codes
   set destination_url = '/scan/' || code
 where destination_url is distinct from '/scan/' || code;

comment on column public.qr_codes.destination_url is
  'Path to encode in the QR image or NFC tag: /scan/<code>. Prefix with the site origin when printing.';

-- ===========================================================================
-- 3. Verified scans
-- ===========================================================================
alter table public.scan_events
  add column if not exists code_verified boolean not null default false;

comment on column public.scan_events.code_verified is
  'true only for scans recorded by record_code_scan() from a real, active venue code. complete_quest() requires one for QR/NFC quests.';

create index if not exists idx_completions_source_scan
  on public.quest_completions (source_scan_id) where source_scan_id is not null;

-- Resolves a scanned code and records a verified scan. Anonymous callers get a
-- scan with no user; complete_quest() lets that user claim it after sign-in.
-- Returns {ok, questId, codeKind, scan} or {ok:false, error:'invalid_code'}.
create or replace function public.record_code_scan(
  p_code text,
  p_anonymous_session_id text,
  p_device_type device_type default 'unknown',
  p_browser text default null,
  p_operating_system text default null,
  p_referrer text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c qr_codes; q quests; s scan_events;
begin
  select * into c from qr_codes
   where upper(code) = upper(trim(p_code)) and status = 'active'
   limit 1;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;

  select * into q from quests where id = c.quest_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;

  insert into scan_events(
    qr_code_id, quest_id, venue_id, partner_id, user_id,
    anonymous_session_id, device_type, browser, operating_system, referrer,
    conversion_state, code_verified
  ) values (
    c.id, q.id, coalesce(c.venue_id, q.venue_id), q.partner_id, auth.uid(),
    coalesce(nullif(p_anonymous_session_id, ''), 'unknown'),
    coalesce(p_device_type, 'unknown'), p_browser, p_operating_system, p_referrer,
    (case when auth.uid() is null then 'scanned' else 'authenticated' end)::scan_conversion_state,
    true
  ) returning * into s;

  return jsonb_build_object('ok', true, 'questId', q.id, 'codeKind', c.kind, 'scan', to_jsonb(s));
end $$;

grant execute on function public.record_code_scan(text, text, device_type, text, text, text)
  to anon, authenticated;

-- record_scan() (page views, direct /q/ links) has failed on every call since
-- 0003: its CASE expression is text, not scan_conversion_state, so the insert
-- errors. That is why production has never recorded a scan, and why /scan/
-- links hang. Same function with the cast added; its scans stay unverified.
create or replace function public.record_scan(
  p_quest_id uuid,
  p_qr_code_id uuid,
  p_anonymous_session_id text,
  p_device_type device_type,
  p_browser text,
  p_operating_system text,
  p_referrer text
) returns scan_events
language plpgsql security definer set search_path = public as $$
declare q quests; s scan_events;
begin
  select * into q from quests where id = p_quest_id;
  if not found then raise exception 'quest_not_found'; end if;

  insert into scan_events(
    qr_code_id, quest_id, venue_id, partner_id, user_id,
    anonymous_session_id, device_type, browser, operating_system, referrer,
    conversion_state
  ) values (
    -- 0018: a client-supplied code id proves nothing, so it is no longer stored.
    null, q.id, q.venue_id, q.partner_id, auth.uid(),
    p_anonymous_session_id, coalesce(p_device_type, 'unknown'), p_browser,
    p_operating_system, p_referrer,
    (case when auth.uid() is null then 'scanned' else 'authenticated' end)::scan_conversion_state
  ) returning * into s;

  return s;
end $$;

-- ===========================================================================
-- 4. Code creation carries the kind and the /scan/ URL
-- ===========================================================================
-- Adding a defaulted parameter would create an ambiguous overload, so the
-- 3-argument version is dropped first; 3-argument callers still resolve.
drop function if exists public.create_qr_code(uuid, uuid, uuid);
create or replace function public.create_qr_code(
  p_quest_id uuid, p_partner_id uuid, p_venue_id uuid, p_kind text default 'qr'
) returns qr_codes
language plpgsql security definer set search_path = public as $$
declare c qr_codes; v_code text;
begin
  if not owns_partner(p_partner_id) then raise exception 'forbidden'; end if;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into qr_codes(quest_id, partner_id, venue_id, code, destination_url, kind)
  values (p_quest_id, p_partner_id, p_venue_id, v_code, '/scan/' || v_code, coalesce(p_kind, 'qr'))
  returning * into c;
  return c;
end $$;

-- ===========================================================================
-- 5. Completion requires a verified scan for QR/NFC quests
-- ===========================================================================
-- 0017's complete_quest plus the 0018 scan check (same 5-argument signature).
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
  v_scan scan_events;
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

  -- 0018: QR/NFC quests need proof of presence: a code-verified scan of one of
  -- this quest's codes, by this user (or claimed from an anonymous scan made
  -- before they signed in), from the last 2 hours, not already used.
  if q.verification_type in ('qr', 'nfc') then
    select * into v_scan from scan_events
     where id = p_source_scan_id
       and quest_id = q.id
       and code_verified
       and (user_id = uid or user_id is null)
       and "timestamp" > now() - interval '2 hours'
     for update;
    if not found
       or exists (select 1 from quest_completions where source_scan_id = v_scan.id) then
      return jsonb_build_object('ok', false, 'error', 'scan_required');
    end if;
    if v_scan.user_id is null then
      update scan_events set user_id = uid where id = v_scan.id;
    end if;
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
--   select has_table_privilege('anon', 'public.qr_codes', 'SELECT');         -- false
--   select count(*) from public.qr_codes where destination_url not like '/scan/%'; -- 0
--   select pg_get_function_identity_arguments('public.record_code_scan'::regproc);
--   Then scan a real sticker (/scan/<code>) signed in and complete the quest;
--   opening the quest page directly and completing must fail with scan_required.
--   Or run scripts/verify-db.sql (checks 24–26).
--
-- Rollback (restores the unverified behaviour):
--   begin;
--   -- re-run complete_quest from 0017_quest_frameworks.sql, then:
--   drop function if exists public.record_code_scan(text, text, device_type, text, text, text);
--   drop function if exists public.create_qr_code(uuid, uuid, uuid, text);
--   -- re-run create_qr_code from 0003_functions.sql
--   drop policy if exists qr_owner_read on public.qr_codes;
--   create policy qr_public_read on public.qr_codes for select
--     using (status = 'active' or public.owns_partner(partner_id));
--   grant select on public.qr_codes to anon;
--   commit;
