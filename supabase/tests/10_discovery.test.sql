-- discover_nearby / get_quest_card / venue_open_state / location_catalog_issues
\ir _helpers.sql
begin;

-- Fixtures (as postgres). Origin = Wynwood centroid 25.8010,-80.1994.
-- 0.001° latitude ≈ 111 m.
create temp table fx (k text primary key, id uuid) on commit drop;
grant all on fx to anon, authenticated;
do $$
declare p uuid := pg_temp.mk_partner('Discovery Partner');
begin
  insert into fx values ('p', p);
  insert into fx values ('v1', pg_temp.mk_venue(p, 'V1 200m',  25.8028, -80.1994, pg_temp.all_day(), 'America/New_York'));
  insert into fx values ('v2', pg_temp.mk_venue(p, 'V2 800m',  25.8082, -80.1994));
  insert into fx values ('v3', pg_temp.mk_venue(p, 'V3 2.5km', 25.8235, -80.1994));
  insert into fx values ('v4', pg_temp.mk_venue(p, 'V4 6km',   25.8550, -80.1994));
  insert into fx values ('v5', pg_temp.mk_venue(p, 'V5 zero',  0, 0));
  insert into fx values ('v6', pg_temp.mk_venue(p, 'V6 paused', 25.8019, -80.1994));
  update public.venues set status = 'paused' where id = (select id from fx where k = 'v6');

  insert into fx values ('q1', pg_temp.mk_quest(p, (select id from fx where k='v1'), 'Q1 art 200m', 'art', 20));
  insert into fx values ('q2', pg_temp.mk_quest(p, (select id from fx where k='v2'), 'Q2 food 800m', 'food', 10));
  insert into fx values ('q3', pg_temp.mk_quest(p, (select id from fx where k='v3'), 'Q3 culture 2.5km', 'culture', null));
  insert into fx values ('q4', pg_temp.mk_quest(p, (select id from fx where k='v4'), 'Q4 art 6km', 'art'));
  insert into fx values ('q5', pg_temp.mk_quest(p, (select id from fx where k='v5'), 'Q5 zero', 'art'));
  insert into fx values ('q6', pg_temp.mk_quest(p, (select id from fx where k='v6'), 'Q6 paused venue', 'art'));
  -- Override: venue is 6 km away, the quest location is ~330 m away.
  insert into fx values ('q7', pg_temp.mk_quest(p, (select id from fx where k='v4'), 'Q7 override', 'outdoors'));
  update public.quests set location_latitude = 25.8040, location_longitude = -80.1994,
         location_label = 'Q7 Entrance' where id = (select id from fx where k = 'q7');
  insert into fx values ('q8', pg_temp.mk_quest(p, (select id from fx where k='v1'), 'Q8 draft', 'art'));
  update public.quests set status = 'draft' where id = (select id from fx where k = 'q8');
  insert into fx values ('q9', pg_temp.mk_quest(p, (select id from fx where k='v1'), 'Q9 expired', 'art'));
  update public.quests set end_date = now() - interval '1 day' where id = (select id from fx where k = 'q9');
  insert into fx values ('q10', pg_temp.mk_quest(p, (select id from fx where k='v1'), 'Q10 venue code', 'nightlife', 20, 'venue_code'));
  update public.quests set verification_secret = 'SECRET42' where id = (select id from fx where k = 'q10');

  insert into fx values ('u_food', pg_temp.mk_user('food@test.local', array['foodie']));
  insert into fx values ('u_admin', pg_temp.mk_user('admin@test.local'));
  update public.users set role = 'admin' where id = (select id from fx where k = 'u_admin');
end $$;

-- ---------------------------------------------------------------------------
-- Guest discovery
-- ---------------------------------------------------------------------------
select pg_temp.act_as(null);
do $$
declare r jsonb; ids uuid[]; scores numeric[]; item jsonb;
begin
  r := public.discover_nearby(25.8010, -80.1994, null, 'device', 3000);
  perform pg_temp.ok((r ->> 'ok')::boolean, 'guest discovery succeeds');
  select array_agg((e ->> 'id')::uuid order by o) into ids
    from jsonb_array_elements(r -> 'items') with ordinality as t(e, o);
  perform pg_temp.ok(
    (select array_agg(x order by x) from unnest(ids) x) =
    (select array_agg(id order by id) from fx where k in ('q1','q2','q3','q7','q10')),
    'radius + eligibility: in-radius active quests only (no 6 km, 0,0, paused venue, draft, expired)');

  select array_agg((e ->> 'score')::numeric order by o) into scores
    from jsonb_array_elements(r -> 'items') with ordinality as t(e, o);
  perform pg_temp.ok((select bool_and(scores[g] >= scores[g + 1]) from generate_series(1, array_length(scores, 1) - 1) g),
    'items ordered by score descending');

  item := (select e from jsonb_array_elements(r -> 'items') e where e ->> 'id' = (select id::text from fx where k = 'q7'));
  perform pg_temp.ok((item ->> 'latitude')::float8 = 25.8040 and item ->> 'locationLabel' = 'Q7 Entrance',
    'override location is the effective location and label');
  perform pg_temp.ok((item ->> 'distanceM')::int between 320 and 340 and (item ->> 'distanceM')::int % 10 = 0,
    'distance is rounded to 10 m');

  item := (select e from jsonb_array_elements(r -> 'items') e where e ->> 'id' = (select id::text from fx where k = 'q10'));
  perform pg_temp.ok(
    (select array_agg(k order by k) from jsonb_object_keys(item) k) =
    array['accessNotes','availability','category','description','difficulty','distanceM','endsAt',
          'estimatedMinutes','id','imageUrl','isSponsored','latitude','locationLabel','longitude',
          'pointsReward','reasons','score','startsAt','title','venueId','venueName','verificationType',
          'xpReward'],
    'QuestCard keys are exactly the allowlist');
  perform pg_temp.ok(position('SECRET42' in r::text) = 0 and position('verification_secret' in r::text) = 0,
    'no verification secret anywhere in the response');
  perform pg_temp.ok(item -> 'availability' ->> 'state' = 'open'
                     and (item -> 'reasons') ? 'nearby',
    'structured hours give open state; nearby reason within 1 km');

  item := (select e from jsonb_array_elements(r -> 'items') e where e ->> 'id' = (select id::text from fx where k = 'q2'));
  perform pg_temp.ok(item -> 'availability' ->> 'state' = 'unknown' and not (item -> 'reasons') ? 'fits_10_minutes',
    'no structured hours: availability unknown and no fits_* claim');
  perform pg_temp.ok(not (r::text like '%"popular"%'), 'no popularity claim');

  r := public.discover_nearby(25.8010, -80.1994, null, 'device', 10000);
  perform pg_temp.ok(r -> 'items' @> jsonb_build_array(jsonb_build_object('id', (select id from fx where k='q4'))),
    'wider radius includes the 6 km quest');
end $$;

-- Validation
do $$
begin
  perform pg_temp.ok(public.discover_nearby('NaN'::float8, -80.1, null, 'device') ->> 'error' = 'invalid_origin', 'NaN latitude rejected');
  perform pg_temp.ok(public.discover_nearby(25.8, 'Infinity'::float8, null, 'device') ->> 'error' = 'invalid_origin', 'Infinity longitude rejected');
  perform pg_temp.ok(public.discover_nearby(91, -80.1, null, 'device') ->> 'error' = 'invalid_origin', 'out-of-range latitude rejected');
  perform pg_temp.ok(public.discover_nearby(null, null, null, 'device') ->> 'error' = 'invalid_origin', 'missing origin rejected');
  perform pg_temp.ok(public.discover_nearby(25.8, -80.1, null, 'gps') ->> 'error' = 'invalid_source', 'unknown source rejected');
  perform pg_temp.ok(public.discover_nearby(25.8, -80.1, null, 'device', 100) ->> 'error' = 'invalid_radius', 'radius below 250 m rejected');
  perform pg_temp.ok(public.discover_nearby(25.8, -80.1, null, 'device', 26000) ->> 'error' = 'invalid_radius', 'radius above 25 km rejected');
  perform pg_temp.ok(public.discover_nearby(25.8, -80.1, null, 'device', 3000, null, null, 0) ->> 'error' = 'invalid_limit', 'limit 0 rejected');
  perform pg_temp.ok(public.discover_nearby(25.8, -80.1, null, 'device', 3000, null, null, 101) ->> 'error' = 'invalid_limit', 'limit 101 rejected');
  perform pg_temp.ok(public.discover_nearby(null, null, 'atlantis', 'area') ->> 'error' = 'unknown_area', 'unknown area rejected');
  perform pg_temp.ok(public.discover_nearby(null, null, 'wynwood', 'area') -> 'origin' ->> 'label' = 'Wynwood'
                     and jsonb_array_length(public.discover_nearby(null, null, 'wynwood', 'area') -> 'items') = 5,
    'area origin resolves from discovery_areas');
end $$;

-- Pagination and cursor integrity
do $$
declare full_ids text[]; paged text[] := '{}'; r jsonb; cur text; pages int := 0; bad text;
begin
  select array_agg(e ->> 'id' order by o) into full_ids
    from jsonb_array_elements(public.discover_nearby(25.8010, -80.1994, null, 'device', 3000) -> 'items')
         with ordinality t(e, o);
  loop
    r := public.discover_nearby(25.8010, -80.1994, null, 'device', 3000, null, null, 2, cur);
    pages := pages + 1;
    paged := paged || array(select e ->> 'id' from jsonb_array_elements(r -> 'items') with ordinality t(e, o) order by o);
    cur := r ->> 'nextCursor';
    exit when cur is null or pages > 10;
  end loop;
  perform pg_temp.ok(pages = 3 and paged = full_ids, 'pages of 2 reproduce the full ordering with no duplicates or gaps');

  cur := public.discover_nearby(25.8010, -80.1994, null, 'device', 3000, null, null, 2) ->> 'nextCursor';
  perform pg_temp.ok(public.discover_nearby(25.8010, -80.1994, null, 'device', 5000, null, null, 2, cur) ->> 'error' = 'invalid_cursor',
    'cursor from a different query is rejected');
  perform pg_temp.ok(public.discover_nearby(25.8010, -80.1994, null, 'device', 3000, null, null, 2, 'not-base64!') ->> 'error' = 'invalid_cursor',
    'garbage cursor is rejected');
  bad := encode(convert_to((convert_from(decode(cur, 'base64'), 'UTF8')::jsonb || '{"h":"forged"}')::text, 'UTF8'), 'base64');
  perform pg_temp.ok(public.discover_nearby(25.8010, -80.1994, null, 'device', 3000, null, null, 2, bad) ->> 'error' = 'invalid_cursor',
    'cursor with a forged query hash is rejected');
end $$;

-- Filters
do $$
declare r jsonb;
begin
  r := public.discover_nearby(25.8010, -80.1994, null, 'device', 3000, array['art']::public.quest_category[]);
  perform pg_temp.ok((select bool_and(e ->> 'category' = 'art') from jsonb_array_elements(r -> 'items') e)
                     and jsonb_array_length(r -> 'items') = 1, 'category filter');
  r := public.discover_nearby(25.8010, -80.1994, null, 'device', 3000, null, 15);
  perform pg_temp.ok(
    (select array_agg(e ->> 'title' order by e ->> 'title') from jsonb_array_elements(r -> 'items') e)
      = array['Q2 food 800m', 'Q3 culture 2.5km'],
    'duration filter keeps short and unknown-duration quests');
end $$;

-- ---------------------------------------------------------------------------
-- Personalized discovery
-- ---------------------------------------------------------------------------
select pg_temp.act_as((select id from fx where k = 'u_food'));
do $$
declare r jsonb; item jsonb;
begin
  r := public.discover_nearby(25.8010, -80.1994, null, 'device', 3000);
  item := (select e from jsonb_array_elements(r -> 'items') e where e ->> 'id' = (select id::text from fx where k = 'q2'));
  perform pg_temp.ok((item -> 'reasons') ? 'matches_food_interest', 'onboarding interest maps to a reason code');

  insert into public.quest_feedback (kind, quest_id) values ('hide', (select id from fx where k = 'q1'));
  insert into public.quest_feedback (kind, venue_id) values ('mute_venue', (select id from fx where k = 'v2'));
  insert into public.quest_feedback (kind, quest_id) values ('save', (select id from fx where k = 'q3'));
  r := public.discover_nearby(25.8010, -80.1994, null, 'device', 3000);
  perform pg_temp.ok(not (r -> 'items' @> jsonb_build_array(jsonb_build_object('id', (select id from fx where k='q1'))))
                     and not (r -> 'items' @> jsonb_build_array(jsonb_build_object('id', (select id from fx where k='q2')))),
    'hidden quest and muted venue are excluded');
  item := (select e from jsonb_array_elements(r -> 'items') e where e ->> 'id' = (select id::text from fx where k = 'q3'));
  perform pg_temp.ok((item -> 'reasons') ? 'saved_quest', 'saved quest reason');
  perform pg_temp.raises($q$insert into public.quest_feedback (user_id, kind, quest_id)
                           values ((select id from fx where k='u_admin'), 'hide', (select id from fx where k='q3'))$q$,
    'cannot write feedback for another user');
end $$;

select pg_temp.act_as_admin();
insert into public.quest_completions (user_id, quest_id, venue_id, partner_id, xp_awarded, points_awarded, completed_at)
select (select id from fx where k='u_food'), id, (select id from fx where k='v3'), (select id from fx where k='p'), 1, 1, now() - interval '2 days'
  from fx where k = 'q3';
select pg_temp.act_as((select id from fx where k = 'u_food'));
do $$
begin
  perform pg_temp.ok(not (public.discover_nearby(25.8010, -80.1994, null, 'device', 3000) -> 'items'
                          @> jsonb_build_array(jsonb_build_object('id', (select id from fx where k='q3')))),
    'completed once-only quest is excluded');
  perform pg_temp.ok(public.get_quest_card((select id from fx where k='q3')) ->> 'state' = 'completed', 'get_quest_card: completed');
end $$;
select pg_temp.act_as_admin();
update public.quests set repeat_cooldown_days = 1 where id = (select id from fx where k = 'q3');
select pg_temp.act_as((select id from fx where k = 'u_food'));
do $$
begin
  perform pg_temp.ok(public.discover_nearby(25.8010, -80.1994, null, 'device', 3000) -> 'items'
                     @> jsonb_build_array(jsonb_build_object('id', (select id from fx where k='q3'))),
    'repeatable quest returns after its cooldown');
end $$;

-- ---------------------------------------------------------------------------
-- get_quest_card states
-- ---------------------------------------------------------------------------
select pg_temp.act_as(null);
do $$
declare r jsonb;
begin
  perform pg_temp.ok(public.get_quest_card(gen_random_uuid()) ->> 'state' = 'not_found', 'get_quest_card: not_found');
  perform pg_temp.ok(public.get_quest_card((select id from fx where k='q8')) ->> 'state' = 'not_found',
    'get_quest_card: draft is invisible to the public');
  perform pg_temp.ok(public.get_quest_card((select id from fx where k='q6')) ->> 'state' = 'inactive', 'get_quest_card: paused venue');
  r := public.get_quest_card((select id from fx where k='q9'));
  perform pg_temp.ok(r ->> 'state' = 'expired' and r -> 'quest' ->> 'title' = 'Q9 expired', 'get_quest_card: expired keeps the card');
  r := public.get_quest_card((select id from fx where k='q10'));
  perform pg_temp.ok(r ->> 'state' = 'available' and r -> 'quest' -> 'distanceM' = 'null'::jsonb
                     and position('SECRET42' in r::text) = 0, 'get_quest_card: available, no distance, no secret');
end $$;

-- ---------------------------------------------------------------------------
-- venue_open_state
-- ---------------------------------------------------------------------------
do $$
declare h jsonb := '{"weekly":{"sun":[],"mon":[["09:00","17:00"]],"tue":[["09:00","17:00"]],
                     "fri":[["18:00","02:00"]],"sat":[["22:00","03:00"]]},
                     "exceptions":{"2026-10-27":[]}}';
        r jsonb;
begin
  r := public.venue_open_state(h, 'America/New_York', '2026-10-26 12:00 America/New_York');
  perform pg_temp.ok(r ->> 'state' = 'open' and (r ->> 'closesAt')::timestamptz = '2026-10-26 21:00+00',
    'open weekday; closesAt converted from local EDT');
  perform pg_temp.ok(public.venue_open_state(h, 'America/New_York', '2026-10-26 18:00 America/New_York') ->> 'state' = 'closed',
    'closed after hours');
  perform pg_temp.ok(public.venue_open_state(h, 'America/New_York', '2026-10-27 12:00 America/New_York') ->> 'state' = 'closed',
    'date exception closes a normally open day');
  r := public.venue_open_state(h, 'America/New_York', '2026-10-31 01:00 America/New_York');
  perform pg_temp.ok(r ->> 'state' = 'open' and (r ->> 'closesAt')::timestamptz = '2026-10-31 02:00 America/New_York',
    'overnight Friday interval still open early Saturday');
  r := public.venue_open_state(h, 'America/New_York', '2026-10-31 23:00 America/New_York');
  perform pg_temp.ok(r ->> 'state' = 'open' and (r ->> 'closesAt')::timestamptz = '2026-11-01 08:00+00',
    'DST end (2026-11-01): Saturday-night close at 03:00 EST = 08:00 UTC');
  perform pg_temp.ok(public.venue_open_state(h, 'America/New_York', '2026-10-29 12:00 America/New_York') ->> 'state' = 'unknown',
    'missing weekday is unknown, not closed');
  perform pg_temp.ok(public.venue_open_state(h, 'Mars/Olympus', now()) ->> 'state' = 'unknown', 'invalid timezone is unknown');
  perform pg_temp.ok(public.venue_open_state(null, 'America/New_York', now()) ->> 'state' = 'unknown', 'no hours is unknown');
  perform pg_temp.ok(public.venue_open_state('{"weekly":{"mon":[["25:99","x"]],"sun":[]}}', 'America/New_York',
                       '2026-10-26 12:00 America/New_York') ->> 'state' = 'unknown', 'malformed interval is unknown');
end $$;

-- ---------------------------------------------------------------------------
-- Curation report is admin-only
-- ---------------------------------------------------------------------------
select pg_temp.raises('select * from public.location_catalog_issues()', 'anon cannot run the curation report');
select pg_temp.act_as((select id from fx where k = 'u_food'));
select pg_temp.raises('select * from public.location_catalog_issues()', 'non-admin cannot run the curation report');
select pg_temp.act_as((select id from fx where k = 'u_admin'));
do $$
begin
  perform pg_temp.ok(exists (select 1 from public.location_catalog_issues()
                              where quest_id = (select id from fx where k='q5') and issue = 'invalid_coordinates'),
    'admin report flags 0,0 coordinates');
end $$;

rollback;
