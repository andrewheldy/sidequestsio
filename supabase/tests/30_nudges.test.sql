-- get_geofence_bundle / claim_nudge / record_nudge_result
\ir _helpers.sql
begin;

create temp table fx (k text primary key, id uuid, t text) on commit drop;
grant all on fx to anon, authenticated;

-- A zone where it is currently mid-afternoon (venue + user), so all-day hours
-- close at local midnight ≥ 5 h away and quiet hours do not apply.
-- A second zone where it is currently night, for the quiet-hours check.
insert into fx (k, t) values ('tz_day', pg_temp.tz_at('11:00', '19:00'));
insert into fx (k, t) values ('tz_night', coalesce(pg_temp.tz_at('22:00', '23:59'), pg_temp.tz_at('00:00', '09:00')));

do $$
declare p uuid := pg_temp.mk_partner('Nudge Partner');
        tz text := (select t from fx where k = 'tz_day');
        soon text := to_char((now() at time zone tz)::time + interval '15 minutes', 'HH24:MI');
        closing jsonb;
begin
  closing := jsonb_build_object('weekly', (select jsonb_object_agg(d, jsonb_build_array(jsonb_build_array('00:00', soon)))
                                             from unnest(array['sun','mon','tue','wed','thu','fri','sat']) d));
  insert into fx (k, id) values ('p', p);
  insert into fx (k, id) values ('va', pg_temp.mk_venue(p, 'VA', 25.8010, -80.1994, pg_temp.all_day(), tz));
  insert into fx (k, id) values ('vb', pg_temp.mk_venue(p, 'VB', 25.8030, -80.1994, pg_temp.all_day(), tz));
  insert into fx (k, id) values ('ve', pg_temp.mk_venue(p, 'VE no hours', 25.8050, -80.1994));
  insert into fx (k, id) values ('vk', pg_temp.mk_venue(p, 'VK closed', 25.8060, -80.1994,
    '{"weekly":{"sun":[],"mon":[],"tue":[],"wed":[],"thu":[],"fri":[],"sat":[]}}', tz));
  insert into fx (k, id) values ('vl', pg_temp.mk_venue(p, 'VL closing', 25.8070, -80.1994, closing, tz));

  insert into fx (k, id) values ('qa', pg_temp.mk_quest(p, (select id from fx where k='va'), 'QA'));
  insert into fx (k, id) values ('qc', pg_temp.mk_quest(p, (select id from fx where k='va'), 'QC same venue'));
  insert into fx (k, id) values ('qb', pg_temp.mk_quest(p, (select id from fx where k='vb'), 'QB'));
  insert into fx (k, id) values ('qd', pg_temp.mk_quest(p, (select id from fx where k='vb'), 'QD sponsored'));
  insert into fx (k, id) values ('qg', pg_temp.mk_quest(p, (select id from fx where k='vb'), 'QG not eligible'));
  insert into fx (k, id) values ('qh', pg_temp.mk_quest(p, (select id from fx where k='vb'), 'QH override'));
  insert into fx (k, id) values ('qe', pg_temp.mk_quest(p, (select id from fx where k='ve'), 'QE unknown hours'));
  insert into fx (k, id) values ('qf', pg_temp.mk_quest(p, (select id from fx where k='ve'), 'QF event window'));
  insert into fx (k, id) values ('qk', pg_temp.mk_quest(p, (select id from fx where k='vk'), 'QK closed'));
  insert into fx (k, id) values ('ql', pg_temp.mk_quest(p, (select id from fx where k='vl'), 'QL closing soon'));
  update public.quests set nudge_eligible = true where partner_id = p and title <> 'QG not eligible';
  update public.quests set is_sponsored = true where id = (select id from fx where k='qd');
  update public.quests set location_latitude = 25.8040, location_longitude = -80.1980 where id = (select id from fx where k='qh');
  update public.quests set start_date = now() - interval '1 hour', end_date = now() + interval '5 hours'
   where id = (select id from fx where k='qf');

  insert into fx (k, id) values ('u', pg_temp.mk_user('nudge-u@test.local'));
  insert into fx (k, id) values ('u2', pg_temp.mk_user('nudge-u2@test.local'));
  insert into fx (k, id) values ('inst', gen_random_uuid());
  insert into fx (k, id) values ('inst2', gen_random_uuid());
  insert into public.nudge_settings (user_id, timezone) values
    ((select id from fx where k='u'), tz), ((select id from fx where k='u2'), tz);
  insert into public.nudge_installations (user_id, installation_id, adventure_enabled) values
    ((select id from fx where k='u'),  (select id from fx where k='inst'),  true),
    ((select id from fx where k='u2'), (select id from fx where k='inst2'), true);
end $$;

-- Claim helper: region id derived like the bundle does.
create or replace function pg_temp.claim(p_quest text, p_key text, p_inst text default 'inst') returns jsonb
language sql as $$
  select public.claim_nudge((select id from fx where k = p_inst), rpad(p_key, 12, '.'), q.id,
           public.nudge_region_id(q.id, q.venue_id, q.location_latitude is not null), 'b1:test', '1.1.0')
    from public.quests q where q.id = (select id from fx where k = p_quest)
$$;
create or replace function pg_temp.reason(p jsonb) returns text language sql as $$
  select case when (p ->> 'allow')::boolean then 'allow' else coalesce(p ->> 'reason', p ->> 'error') end
$$;

select pg_temp.act_as((select id from fx where k = 'u'));
do $$
begin
  perform public.record_consent('location_background', true, '1.1.0', (select id from fx where k='inst'));
  perform public.record_consent('notifications', true, '1.1.0', (select id from fx where k='inst'));
  perform pg_temp.ok(pg_temp.reason(pg_temp.claim('qa', 'key-flag-off')) = 'delivery_disabled',
    'delivery flag off: no claim');
end $$;

select pg_temp.act_as_admin();
update public.app_feature_flags set enabled = true where key = 'nudge_delivery';

select pg_temp.act_as((select id from fx where k = 'u2'));
do $$
begin
  perform pg_temp.ok(pg_temp.reason(pg_temp.claim('qa', 'key-u2-1', 'inst2')) = 'consent_missing',
    'no background/notification consent: denied');
  perform public.record_consent('location_background', true, '1.1.0');
  perform pg_temp.ok(pg_temp.reason(pg_temp.claim('qa', 'key-u2-2', 'inst2')) = 'consent_missing',
    'background consent alone is not notification consent');
end $$;

-- ---------------------------------------------------------------------------
-- Bundle
-- ---------------------------------------------------------------------------
select pg_temp.act_as((select id from fx where k = 'u'));
do $$
declare b jsonb; ids text[]; va jsonb; cands text[];
begin
  b := public.get_geofence_bundle(25.8015, -80.1990, (select id from fx where k='inst'));
  perform pg_temp.ok((b ->> 'ok')::boolean and (b ->> 'deliveryEnabled')::boolean, 'bundle for a signed-in user');
  select array_agg(r ->> 'id') into ids from jsonb_array_elements(b -> 'regions') r;
  perform pg_temp.ok(ids @> array['v:' || (select id from fx where k='va'), 'v:' || (select id from fx where k='vb'),
                                  'v:' || (select id from fx where k='ve'), 'q:' || (select id from fx where k='qh')]
                     and jsonb_array_length(b -> 'regions') <= 15,
    'regions: venues plus the override quest, bounded');
  va := (select r from jsonb_array_elements(b -> 'regions') r where r ->> 'id' = 'v:' || (select id from fx where k='va'));
  perform pg_temp.ok(jsonb_array_length(va -> 'questIds') = 2 and (va ->> 'radiusM')::int = 250,
    'colocated quests share one 250 m venue region');
  select array_agg(c ->> 'questId') into cands from jsonb_array_elements(b -> 'candidates') c;
  perform pg_temp.ok(not cands && array[(select id::text from fx where k='qd'), (select id::text from fx where k='qg'),
                                        (select id::text from fx where k='qe')]
                     and cands @> array[(select id::text from fx where k='qf')],
    'candidates exclude sponsored, non-eligible and unknown-hours quests; keep explicit event windows');
  perform pg_temp.ok(b -> 'coverage' ->> 'areaId' = 'wynwood' and b -> 'refreshRegion' ->> 'id' = 'refresh:wynwood'
                     and (b -> 'refreshRegion' ->> 'latitude')::float8 = 25.8010
                     and (b -> 'refreshRegion' ->> 'radiusM')::int between 2000 and 5000,
    'refresh region is anchored to the public area centroid, not the device');
  perform pg_temp.ok(position('25.8015' in b::text) = 0, 'bundle does not echo the device origin');
  perform pg_temp.ok((b ->> 'expiresAt')::timestamptz = now() + interval '24 hours', 'bundle expires in 24 h');
  perform pg_temp.ok(public.get_geofence_bundle('NaN', -80.19) ->> 'error' = 'invalid_origin', 'bundle rejects NaN origin');
end $$;

savepoint many;
select pg_temp.act_as_admin();
do $$
declare p uuid := (select id from fx where k='p'); vid uuid; i int;
begin
  for i in 1..20 loop
    vid := pg_temp.mk_venue(p, 'Extra ' || i, 25.79 + i * 0.001, -80.21, pg_temp.all_day(), 'UTC');
    perform pg_temp.mk_quest(p, vid, 'Extra quest ' || i);
  end loop;
  update public.quests set nudge_eligible = true where title like 'Extra quest %';
end $$;
select pg_temp.act_as((select id from fx where k = 'u'));
select pg_temp.ok(jsonb_array_length(public.get_geofence_bundle(25.8015, -80.1990) -> 'regions') = 15,
  'bundle never exceeds 15 regions');
rollback to savepoint many;

-- ---------------------------------------------------------------------------
-- Denials (none of these store a claim)
-- ---------------------------------------------------------------------------
select pg_temp.act_as((select id from fx where k = 'u'));
do $$
begin
  perform pg_temp.ok(pg_temp.reason(public.claim_nudge((select id from fx where k='inst'), 'short',
                       (select id from fx where k='qa'), 'v:x')) = 'invalid_request', 'short idempotency key rejected');
  perform pg_temp.ok(pg_temp.reason(public.claim_nudge((select id from fx where k='inst'), 'key-region',
                       (select id from fx where k='qa'), 'v:' || (select id from fx where k='vb'))) = 'invalid_candidate',
    'region that does not match the quest is rejected');
  perform pg_temp.ok(pg_temp.reason(pg_temp.claim('qg', 'key-qg')) = 'not_eligible', 'not nudge-eligible quest denied');
  perform pg_temp.ok(pg_temp.reason(pg_temp.claim('qd', 'key-qd')) = 'not_eligible', 'sponsored quest denied while flag off');
  perform pg_temp.ok(pg_temp.reason(pg_temp.claim('qe', 'key-qe')) = 'availability_unknown', 'unknown hours denied');
  perform pg_temp.ok(pg_temp.reason(pg_temp.claim('qk', 'key-qk')) = 'closed', 'closed venue denied');
  perform pg_temp.ok(pg_temp.reason(pg_temp.claim('ql', 'key-ql')) = 'closed', 'closing before duration + 10 min denied');
  perform pg_temp.ok(pg_temp.reason(public.claim_nudge(gen_random_uuid(), 'key-inst', (select id from fx where k='qa'),
                       'v:' || (select id from fx where k='va'))) = 'paused', 'unknown installation is treated as paused');
end $$;

savepoint s1;
insert into public.quest_feedback (kind, quest_id) values ('hide', (select id from fx where k='qa'));
select pg_temp.ok(pg_temp.reason(pg_temp.claim('qa', 'key-hidden')) = 'not_eligible', 'hidden quest denied');
rollback to savepoint s1;
select pg_temp.act_as((select id from fx where k = 'u'));

savepoint s2;
select pg_temp.act_as_admin();
insert into public.quest_attempts (user_id, quest_id, status)
values ((select id from fx where k='u'), (select id from fx where k='qa'), 'in_progress');
select pg_temp.act_as((select id from fx where k = 'u'));
select pg_temp.ok(pg_temp.reason(pg_temp.claim('qa', 'key-attempt')) = 'not_eligible', 'quest already in progress denied');
rollback to savepoint s2;
select pg_temp.act_as((select id from fx where k = 'u'));

savepoint s3;
update public.nudge_installations set paused = true;
select pg_temp.ok(pg_temp.reason(pg_temp.claim('qa', 'key-paused')) = 'paused', 'device pause denies');
rollback to savepoint s3;
select pg_temp.act_as((select id from fx where k = 'u'));
savepoint s4;
update public.nudge_settings set adventure_paused = true;
select pg_temp.ok(pg_temp.reason(pg_temp.claim('qa', 'key-paused2')) = 'paused', 'account pause denies');
rollback to savepoint s4;
select pg_temp.act_as((select id from fx where k = 'u'));
savepoint s5;
update public.nudge_settings set timezone = null;
select pg_temp.ok(pg_temp.reason(pg_temp.claim('qa', 'key-tz')) = 'timezone_unknown', 'unknown timezone fails closed');
rollback to savepoint s5;
select pg_temp.act_as((select id from fx where k = 'u'));

savepoint s6;
update public.nudge_settings set timezone = (select t from fx where k = 'tz_night');
select pg_temp.ok(pg_temp.reason(pg_temp.claim('qa', 'key-quiet')) = 'quiet_hours',
  'quiet hours evaluated in the user''s timezone (' || (select t from fx where k = 'tz_night') || ')');
select pg_temp.ok(pg_temp.reason(pg_temp.claim('qf', 'key-quiet-ev')) = 'quiet_hours',
  'event window does not bypass quiet hours without opt-in');
update public.nudge_settings set allow_event_windows = true;
select pg_temp.ok(pg_temp.reason(pg_temp.claim('qf', 'key-quiet-ev2')) = 'allow',
  'opted-in event window bypasses quiet hours');
select pg_temp.ok(pg_temp.reason(pg_temp.claim('qa', 'key-quiet-2')) = 'quiet_hours',
  'opt-in only applies to event windows');
rollback to savepoint s6;
select pg_temp.act_as((select id from fx where k = 'u'));

savepoint s7;
update public.nudge_settings set max_per_day = 0;
select pg_temp.ok(pg_temp.reason(pg_temp.claim('qa', 'key-zero')) = 'cap_reached', 'user cap 0 disables nudges');
rollback to savepoint s7;
select pg_temp.act_as((select id from fx where k = 'u'));

-- ---------------------------------------------------------------------------
-- Cadence and idempotency
-- ---------------------------------------------------------------------------
do $$
declare a jsonb; r jsonb;
begin
  a := pg_temp.claim('qa', 'key-k1');
  perform pg_temp.ok(pg_temp.reason(a) = 'allow' and a -> 'quest' ->> 'title' = 'QA'
                     and (a -> 'quest' ->> 'xpReward')::int = 150, 'eligible claim allowed with canonical rewards');
  r := pg_temp.claim('qa', 'key-k1');
  perform pg_temp.ok((r ->> 'replay')::boolean and r ->> 'claimId' = a ->> 'claimId', 'same idempotency key replays the same claim');
  perform pg_temp.ok(pg_temp.reason(pg_temp.claim('qb', 'key-k2')) = 'min_gap', 'second claim within 3 h denied');
end $$;

select pg_temp.act_as_admin();
update public.nudge_claims set claimed_at = now() - interval '4 hours' where idempotency_key = rpad('key-k1', 12, '.');
select pg_temp.act_as((select id from fx where k = 'u'));
select pg_temp.ok(pg_temp.reason(pg_temp.claim('qc', 'key-k3')) = 'venue_suppressed', 'same venue within 24 h denied');
select pg_temp.ok(pg_temp.reason(pg_temp.claim('qb', 'key-k4')) = 'allow', 'second claim after the gap allowed');

select pg_temp.act_as_admin();
update public.nudge_claims set claimed_at = now() - interval '3 hours 30 minutes' where idempotency_key = rpad('key-k4', 12, '.');
select pg_temp.act_as((select id from fx where k = 'u'));
select pg_temp.ok(pg_temp.reason(pg_temp.claim('qh', 'key-k5')) = 'cap_reached', 'third claim in rolling 24 h denied');

select pg_temp.act_as_admin();
update public.nudge_claims set claimed_at = now() - interval '2 days' where idempotency_key in (rpad('key-k1', 12, '.'), rpad('key-k4', 12, '.'));
select pg_temp.act_as((select id from fx where k = 'u'));
select pg_temp.ok(pg_temp.reason(pg_temp.claim('qa', 'key-k6')) = 'quest_suppressed', 'same quest within 7 days denied');
select pg_temp.ok(pg_temp.reason(pg_temp.claim('qc', 'key-k7')) = 'allow', 'other quest at the venue after 24 h allowed');

savepoint s8;
update public.nudge_settings set max_per_day = 1;
select pg_temp.act_as_admin();
update public.nudge_claims set claimed_at = now() - interval '5 hours' where idempotency_key = rpad('key-k7', 12, '.');
select pg_temp.act_as((select id from fx where k = 'u'));
select pg_temp.ok(pg_temp.reason(pg_temp.claim('qh', 'key-k8')) = 'cap_reached', 'user-lowered cap of 1 enforced');
rollback to savepoint s8;
select pg_temp.act_as((select id from fx where k = 'u'));

-- ---------------------------------------------------------------------------
-- Results
-- ---------------------------------------------------------------------------
create temp table claim7 on commit drop as
  select public.claim_nudge((select id from fx where k='inst'), rpad('key-k7', 12, '.'), (select id from fx where k='qc'),
           'v:' || (select id from fx where k='va')) as r;
do $$
declare cid uuid := (select (r ->> 'claimId')::uuid from claim7);
begin
  perform pg_temp.ok(public.record_nudge_result(cid, 'scheduled') ->> 'outcome' = 'scheduled', 'reserved → scheduled');
  perform pg_temp.ok(public.record_nudge_result(cid, 'scheduled') ->> 'ok' = 'true', 'repeating a result is idempotent');
  perform pg_temp.ok(public.record_nudge_result(cid, 'opened') ->> 'outcome' = 'opened', 'scheduled → opened');
  perform pg_temp.ok(public.record_nudge_result(cid, 'scheduled') ->> 'error' = 'invalid_transition', 'opened cannot go back');
  perform pg_temp.ok(public.record_nudge_result(cid, 'completed') ->> 'error' = 'invalid_request', 'outcome allowlist');
  perform pg_temp.ok(public.record_nudge_result(gen_random_uuid(), 'scheduled') ->> 'error' = 'not_found', 'unknown claim');
end $$;
grant select on claim7 to authenticated;
select pg_temp.act_as((select id from fx where k = 'u2'));
select pg_temp.ok(public.record_nudge_result((select (r ->> 'claimId')::uuid from claim7), 'schedule_failed') ->> 'error' = 'not_found',
  'another user cannot touch the claim');

select pg_temp.act_as_admin();
select pg_temp.ok((select count(*) from public.nudge_claims where user_id = (select id from fx where k='u')) = 3,
  'only allowed claims are stored (denials leave no record)');
select pg_temp.ok(not exists (select 1 from information_schema.columns where table_name = 'nudge_claims'
                               and column_name ~ '(^|_)(lat|latitude|lng|lon|longitude|accuracy|accuracy_m|geog|location)(_|$)'),
  'nudge_claims has no coordinate columns');
update public.app_feature_flags set enabled = false where key = 'nudge_delivery';
select pg_temp.act_as((select id from fx where k = 'u'));
select pg_temp.ok(pg_temp.reason(pg_temp.claim('qc', 'key-k7')) = 'delivery_disabled',
  'emergency stop also blocks replays');
select pg_temp.act_as_admin();
update public.app_feature_flags set enabled = true where key = 'nudge_delivery';
select pg_temp.act_as((select id from fx where k = 'u'));
select public.record_consent('notifications', false, '1.1.0');
select pg_temp.ok(pg_temp.reason(pg_temp.claim('qc', 'key-k7')) = 'consent_missing',
  'withdrawn notification consent (latest decision) denies');

select pg_temp.act_as_admin();
update public.nudge_claims set claimed_at = now() - interval '31 days' where idempotency_key = rpad('key-k1', 12, '.');
select pg_temp.ok(public.purge_nudge_records() = 1, 'purge removes claims older than 30 days');

rollback;
