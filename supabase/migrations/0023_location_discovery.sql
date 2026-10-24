-- 0023_location_discovery.sql — PostGIS-backed nearby discovery (Phase 1)
--
-- WHY: the native Explore screen needs "quests near me / near this area" with
-- honest distance and availability. Venues only have free-text hours and
-- quests only a display duration string, so nothing could answer "is this
-- open long enough to do now?". See docs/product/LOCATION_DISCOVERY.md §4–§5.
--
-- What changes (all additive):
--   1. postgis in schema `extensions`.
--   2. venues: generated `geog` from latitude/longitude (one editable source;
--      NULL for out-of-range or 0,0 placeholders) + GiST index; structured
--      `opening_hours` (jsonb), IANA `timezone`, location provenance.
--   3. quests: optional location override (+ generated `location_geog`, GiST),
--      public `location_label`, `estimated_minutes`, access notes, sponsorship,
--      nudge eligibility/radius, GPS verification radius, editorial quality.
--   4. discovery_areas: public neighborhood centroids (manual origins and the
--      Adventure refresh-region anchor). Seeded for Miami.
--   5. quest_feedback: user-owned save / hide / mute_venue / fewer_category.
--   6. venue_open_state(), discover_nearby(), get_quest_card(),
--      location_catalog_issues().
--
-- Privacy: discover_nearby() takes the device origin as an argument, uses it in
-- memory and never writes or logs it. Nothing here stores device coordinates.
--
-- Security: discover_nearby/get_quest_card are SECURITY INVOKER, so the
-- caller's RLS applies (public quests/venues; only their own completions,
-- profile interests and feedback). Responses are an explicit allowlist — no
-- verification secret, venue code or private field is ever serialized.
--
-- Deploy order: apply before shipping a mobile build with nearby discovery.
-- The website does not call any of this. Idempotent; one transaction.

create extension if not exists postgis with schema extensions;

begin;

-- ===========================================================================
-- 1. Venue geography + structured availability
-- ===========================================================================
alter table public.venues
  add column if not exists geog extensions.geography(Point, 4326)
    generated always as (
      case
        when latitude between -90 and 90
         and longitude between -180 and 180
         and not (latitude = 0 and longitude = 0)
        then extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
      end
    ) stored;

create index if not exists idx_venues_geog on public.venues using gist (geog);

alter table public.venues add column if not exists timezone            text;
alter table public.venues add column if not exists opening_hours       jsonb;
alter table public.venues add column if not exists location_source     text;
alter table public.venues add column if not exists location_checked_at timestamptz;

comment on column public.venues.geog is
  'Derived from latitude/longitude (edit those, never this). NULL when the pair is missing, out of range or 0,0.';
comment on column public.venues.timezone is
  'IANA timezone of the venue (e.g. America/New_York). NULL = hours cannot be evaluated.';
comment on column public.venues.opening_hours is
  'Structured local hours: {"weekly":{"mon":[["09:00","17:00"]],...},"exceptions":{"YYYY-MM-DD":[]}}. '
  'A missing day is unknown; [] is closed; an end earlier than its start runs past midnight. '
  'The display-only hours/hours_note strings are never parsed.';
comment on column public.venues.location_source is
  'Where the pin came from (e.g. "curator_site_visit", "geocoder"). Pins go at the accessible entrance.';

-- ===========================================================================
-- 2. Quest location settings
-- ===========================================================================
alter table public.quests add column if not exists location_latitude  double precision;
alter table public.quests add column if not exists location_longitude double precision;
alter table public.quests add column if not exists location_label     text;
alter table public.quests
  add column if not exists location_geog extensions.geography(Point, 4326)
    generated always as (
      case
        when location_latitude between -90 and 90
         and location_longitude between -180 and 180
         and not (location_latitude = 0 and location_longitude = 0)
        then extensions.st_setsrid(extensions.st_makepoint(location_longitude, location_latitude), 4326)::extensions.geography
      end
    ) stored;

create index if not exists idx_quests_location_geog on public.quests using gist (location_geog);
create index if not exists idx_quests_venue on public.quests (venue_id);

alter table public.quests add column if not exists estimated_minutes     integer;
alter table public.quests add column if not exists access_notes          text;
alter table public.quests add column if not exists is_sponsored          boolean not null default false;
alter table public.quests add column if not exists nudge_eligible        boolean not null default false;
alter table public.quests add column if not exists nudge_radius_m        integer not null default 250;
alter table public.quests add column if not exists verification_radius_m integer;
alter table public.quests add column if not exists editorial_quality     numeric(3,2) not null default 0.5;
alter table public.quests add column if not exists location_source       text;
alter table public.quests add column if not exists location_checked_at   timestamptz;

alter table public.quests drop constraint if exists quests_location_override_pair;
alter table public.quests add constraint quests_location_override_pair
  check ((location_latitude is null) = (location_longitude is null));
alter table public.quests drop constraint if exists quests_estimated_minutes_range;
alter table public.quests add constraint quests_estimated_minutes_range
  check (estimated_minutes is null or estimated_minutes between 1 and 600);
alter table public.quests drop constraint if exists quests_nudge_radius_range;
alter table public.quests add constraint quests_nudge_radius_range
  check (nudge_radius_m between 150 and 400);
alter table public.quests drop constraint if exists quests_verification_radius_range;
alter table public.quests add constraint quests_verification_radius_range
  check (verification_radius_m is null or verification_radius_m between 75 and 150);
alter table public.quests drop constraint if exists quests_editorial_quality_range;
alter table public.quests add constraint quests_editorial_quality_range
  check (editorial_quality between 0 and 1);

comment on column public.quests.location_latitude is
  'Optional override (landmark quest, different entrance). Effective location = override when set, else the venue.';
comment on column public.quests.estimated_minutes is
  'Structured duration for "do now" fit. NULL = unknown (estimated_time stays display-only).';
comment on column public.quests.nudge_eligible is
  'Curated opt-in for background nearby alerts. Default false.';
comment on column public.quests.nudge_radius_m is
  'Geofence radius for nearby alerts (150–400 m). Not a proof radius.';
comment on column public.quests.verification_radius_m is
  'GPS presence radius (75–150 m) for verification_type = gps; NULL uses 100 m.';
comment on column public.quests.editorial_quality is
  'Curated 0–1 quality signal (neutral 0.5). Not a popularity statistic.';

-- ===========================================================================
-- 3. Public discovery areas
-- ===========================================================================
create table if not exists public.discovery_areas (
  id         text primary key,
  label      text not null,
  market     text not null,
  latitude   double precision not null check (latitude between -90 and 90),
  longitude  double precision not null check (longitude between -180 and 180),
  sort_order integer not null default 0,
  geog       extensions.geography(Point, 4326)
    generated always as (extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography) stored
);
create index if not exists idx_discovery_areas_geog on public.discovery_areas using gist (geog);

comment on table public.discovery_areas is
  'Public neighborhood centroids used as manual browsing origins and refresh-region anchors. Never a person''s location.';

-- Approximate public neighborhood centroids (not venue claims).
insert into public.discovery_areas (id, label, market, latitude, longitude, sort_order) values
  ('wynwood',         'Wynwood',         'miami', 25.8010, -80.1994, 10),
  ('little-river',    'Little River',    'miami', 25.8466, -80.1903, 20),
  ('design-district', 'Design District', 'miami', 25.8128, -80.1928, 30),
  ('midtown',         'Midtown',         'miami', 25.8045, -80.1925, 40),
  ('downtown',        'Downtown',        'miami', 25.7743, -80.1937, 50),
  ('brickell',        'Brickell',        'miami', 25.7617, -80.1918, 60),
  ('little-havana',   'Little Havana',   'miami', 25.7680, -80.2196, 70),
  ('south-beach',     'South Beach',     'miami', 25.7826, -80.1341, 80),
  ('coconut-grove',   'Coconut Grove',   'miami', 25.7280, -80.2420, 90)
on conflict (id) do nothing;

alter table public.discovery_areas enable row level security;
drop policy if exists discovery_areas_public_read on public.discovery_areas;
create policy discovery_areas_public_read on public.discovery_areas for select using (true);
revoke all on public.discovery_areas from public, anon, authenticated;
grant select on public.discovery_areas to anon, authenticated;

-- ===========================================================================
-- 4. Recommendation feedback (user-owned)
-- ===========================================================================
create table if not exists public.quest_feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.users(id) on delete cascade,
  kind       text not null check (kind in ('save', 'hide', 'mute_venue', 'fewer_category')),
  quest_id   uuid references public.quests(id) on delete cascade,
  venue_id   uuid references public.venues(id) on delete cascade,
  category   public.quest_category,
  created_at timestamptz not null default now(),
  constraint quest_feedback_target check (
    (kind in ('save', 'hide') and quest_id is not null and venue_id is null and category is null) or
    (kind = 'mute_venue'      and venue_id is not null and quest_id is null and category is null) or
    (kind = 'fewer_category'  and category is not null and quest_id is null and venue_id is null)
  )
);
create unique index if not exists quest_feedback_unique_quest
  on public.quest_feedback (user_id, kind, quest_id) where quest_id is not null;
create unique index if not exists quest_feedback_unique_venue
  on public.quest_feedback (user_id, venue_id) where kind = 'mute_venue';
create unique index if not exists quest_feedback_unique_category
  on public.quest_feedback (user_id, category) where kind = 'fewer_category';

alter table public.quest_feedback enable row level security;
drop policy if exists quest_feedback_self_read   on public.quest_feedback;
drop policy if exists quest_feedback_self_insert on public.quest_feedback;
drop policy if exists quest_feedback_self_delete on public.quest_feedback;
create policy quest_feedback_self_read on public.quest_feedback for select
  using (user_id = auth.uid());
create policy quest_feedback_self_insert on public.quest_feedback for insert
  with check (user_id = auth.uid());
create policy quest_feedback_self_delete on public.quest_feedback for delete
  using (user_id = auth.uid());
revoke all on public.quest_feedback from public, anon, authenticated;
grant select, insert, delete on public.quest_feedback to authenticated;

comment on table public.quest_feedback is
  'Explicit discovery feedback. A notification that was not opened is never recorded as a dismissal.';

-- ===========================================================================
-- 5. Availability: structured hours → open / closed / unknown
-- ===========================================================================
-- Returns {"state": "open"|"closed"|"unknown", "closesAt": timestamptz|null}.
-- Local wall-clock intervals are converted with AT TIME ZONE, so DST
-- transitions are handled by Postgres' tz database. Anything missing or
-- malformed is "unknown" (the UI says "Hours not confirmed"), never "open".
create or replace function public.venue_open_state(
  p_hours jsonb, p_tz text, p_at timestamptz default now()
) returns jsonb
language plpgsql stable set search_path = public, extensions, pg_temp as $$
declare
  v_unknown constant jsonb := jsonb_build_object('state', 'unknown', 'closesAt', null);
  v_local   timestamp;
  v_day     date;
  v_time    time;
  v_ivs     jsonb;
  v_iv      jsonb;
  v_start   time;
  v_end     time;
  v_prev_known boolean;
  v_days    constant text[] := array['sun','mon','tue','wed','thu','fri','sat'];
begin
  if p_hours is null or jsonb_typeof(p_hours) <> 'object' or p_tz is null or p_at is null then
    return v_unknown;
  end if;

  begin
    -- An unrecognized zone raises here and lands in the handler below. (Not a
    -- pg_timezone_names lookup: that scans the tz database on every call.)
    v_local := p_at at time zone p_tz;
    v_day   := v_local::date;
    v_time  := v_local::time;

    -- Yesterday's overnight intervals can still be running now.
    v_ivs := coalesce(p_hours -> 'exceptions' -> to_char(v_day - 1, 'YYYY-MM-DD'),
                      p_hours -> 'weekly' -> v_days[extract(dow from v_day - 1)::int + 1]);
    v_prev_known := v_ivs is not null and jsonb_typeof(v_ivs) = 'array';
    if v_prev_known then
      for v_iv in select * from jsonb_array_elements(v_ivs) loop
        v_start := (v_iv ->> 0)::time; v_end := (v_iv ->> 1)::time;
        if v_end <= v_start and v_time < v_end then
          return jsonb_build_object('state', 'open', 'closesAt', (v_day + v_end) at time zone p_tz);
        end if;
      end loop;
    end if;

    v_ivs := coalesce(p_hours -> 'exceptions' -> to_char(v_day, 'YYYY-MM-DD'),
                      p_hours -> 'weekly' -> v_days[extract(dow from v_day)::int + 1]);
    if v_ivs is null or jsonb_typeof(v_ivs) <> 'array' then
      return v_unknown;
    end if;
    for v_iv in select * from jsonb_array_elements(v_ivs) loop
      v_start := (v_iv ->> 0)::time; v_end := (v_iv ->> 1)::time;
      if v_end > v_start and v_time >= v_start and v_time < v_end then
        return jsonb_build_object('state', 'open', 'closesAt', (v_day + v_end) at time zone p_tz);
      elsif v_end <= v_start and v_time >= v_start then
        return jsonb_build_object('state', 'open', 'closesAt', (v_day + 1 + v_end) at time zone p_tz);
      end if;
    end loop;
  exception when others then
    return v_unknown;  -- unknown timezone or malformed interval strings
  end;

  -- Not open by today's intervals; without yesterday we cannot rule out a spill.
  if not v_prev_known then return v_unknown; end if;
  return jsonb_build_object('state', 'closed', 'closesAt', null);
end $$;

-- ===========================================================================
-- 6. Safe quest card (the only shape discovery ever returns)
-- ===========================================================================
-- Interest vibes from onboarding (profiles.interests) → quest categories.
create or replace function public.interest_categories(p_interests text[])
returns public.quest_category[]
language sql immutable set search_path = public, extensions, pg_temp as $$
  select coalesce(array_agg(distinct m.cat), '{}'::public.quest_category[])
    from unnest(coalesce(p_interests, '{}'::text[])) as i(v)
    join (values
      ('foodie', 'food'::public.quest_category), ('food', 'food'),
      ('nightlife', 'nightlife'),
      ('culture', 'culture'), ('culture', 'art'), ('art', 'art'),
      ('outdoor', 'outdoors'), ('outdoors', 'outdoors'),
      ('hidden-gems', 'hidden_gem'), ('hidden gems', 'hidden_gem'), ('hidden_gem', 'hidden_gem'),
      ('wellness', 'fitness'), ('fitness', 'fitness'),
      ('shopping', 'shopping')
    ) as m(vibe, cat) on m.vibe = lower(trim(i.v))
$$;

-- Two composite arguments, so PostgREST does not expose it as a computed column.
create or replace function public.location_quest_card(
  q public.quests, v public.venues, p_distance_m integer,
  p_availability jsonb, p_reasons text[], p_score numeric
) returns jsonb
language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object(
    'id',               q.id,
    'title',            q.title,
    'description',      q.description,
    'category',         q.category,
    'difficulty',       q.difficulty,
    'xpReward',         q.xp_reward,
    'pointsReward',     q.points_reward,
    'imageUrl',         q.image_url,
    'venueId',          v.id,
    'venueName',        v.name,
    'locationLabel',    coalesce(q.location_label, v.neighborhood, v.name, v.city),
    'latitude',         case when q.location_latitude is not null then
                          case when q.location_geog is not null then q.location_latitude end
                        else case when v.geog is not null then v.latitude end end,
    'longitude',        case when q.location_latitude is not null then
                          case when q.location_geog is not null then q.location_longitude end
                        else case when v.geog is not null then v.longitude end end,
    'distanceM',        case when p_distance_m is null then null else (round(p_distance_m / 10.0) * 10)::int end,
    'estimatedMinutes', q.estimated_minutes,
    'verificationType', q.verification_type,
    'accessNotes',      q.access_notes,
    'isSponsored',      q.is_sponsored,
    'startsAt',         q.start_date,
    'endsAt',           q.end_date,
    'availability',     coalesce(p_availability, jsonb_build_object('state', 'unknown', 'closesAt', null)),
    'reasons',          to_jsonb(coalesce(p_reasons, '{}'::text[])),
    'score',            p_score
  )
$$;

-- ===========================================================================
-- 7. discover_nearby
-- ===========================================================================
create or replace function public.discover_nearby(
  p_origin_lat  double precision default null,
  p_origin_lng  double precision default null,
  p_area_id     text default null,
  p_source      text default 'device',
  p_radius_m    integer default 3000,
  p_categories  public.quest_category[] default null,
  p_max_minutes integer default null,
  p_limit       integer default 30,
  p_cursor      text default null
) returns jsonb
language plpgsql stable security invoker set search_path = public, extensions, pg_temp as $$
declare
  uid        uuid := auth.uid();
  v_now      timestamptz := now();
  v_lat      double precision := p_origin_lat;
  v_lng      double precision := p_origin_lng;
  v_label    text;
  v_origin   extensions.geography;
  v_limit    integer := coalesce(p_limit, 30);
  v_radius   integer := coalesce(p_radius_m, 3000);
  v_hash     text;
  v_cur      jsonb;
  c_score    numeric;
  c_dist     integer;
  c_id       uuid;
  v_interests public.quest_category[];
  v_has_interests boolean := false;
  v_hidden   uuid[] := '{}';
  v_muted    uuid[] := '{}';
  v_saved    uuid[] := '{}';
  v_fewer    public.quest_category[] := '{}';
  v_done_ids uuid[] := '{}';
  v_done_at  timestamptz[] := '{}';
  v_items    jsonb;
  v_count    integer;
  v_last     jsonb;
  v_next     text;
begin
  if p_source is null or p_source not in ('device', 'area', 'map') then
    return jsonb_build_object('ok', false, 'error', 'invalid_source');
  end if;
  if v_radius < 250 or v_radius > 25000 then
    return jsonb_build_object('ok', false, 'error', 'invalid_radius');
  end if;
  if v_limit < 1 or v_limit > 100 then
    return jsonb_build_object('ok', false, 'error', 'invalid_limit');
  end if;
  if p_max_minutes is not null and (p_max_minutes < 1 or p_max_minutes > 600) then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;

  if p_source = 'area' then
    select a.latitude, a.longitude, a.label into v_lat, v_lng, v_label
      from public.discovery_areas a where a.id = p_area_id;
    if not found then return jsonb_build_object('ok', false, 'error', 'unknown_area'); end if;
  end if;
  -- NaN compares greater than every number in Postgres, so BETWEEN rejects it
  -- along with ±Infinity and out-of-range values.
  if v_lat is null or v_lng is null
     or not (v_lat between -90 and 90) or not (v_lng between -180 and 180) then
    return jsonb_build_object('ok', false, 'error', 'invalid_origin');
  end if;
  v_origin := extensions.st_setsrid(extensions.st_makepoint(v_lng, v_lat), 4326)::extensions.geography;

  v_hash := md5(concat_ws('|', p_source, coalesce(p_area_id, ''), round(v_lat::numeric, 5),
                          round(v_lng::numeric, 5), v_radius, coalesce(p_categories::text, ''),
                          coalesce(p_max_minutes::text, ''), v_limit));
  if p_cursor is not null then
    begin
      v_cur   := convert_from(decode(p_cursor, 'base64'), 'UTF8')::jsonb;
      c_score := (v_cur ->> 's')::numeric;
      c_dist  := (v_cur ->> 'd')::integer;
      c_id    := (v_cur ->> 'id')::uuid;
    exception when others then
      return jsonb_build_object('ok', false, 'error', 'invalid_cursor');
    end;
    if v_cur ->> 'h' is distinct from v_hash or c_score is null or c_dist is null or c_id is null then
      return jsonb_build_object('ok', false, 'error', 'invalid_cursor');
    end if;
  end if;

  if uid is not null then
    select public.interest_categories(p.interests) into v_interests
      from public.profiles p where p.user_id = uid;
    v_has_interests := coalesce(cardinality(v_interests), 0) > 0;
    -- Personal state is read only for a signed-in caller (and only their own
    -- rows, by RLS), so the guest path never touches these tables.
    select coalesce(array_agg(quest_id) filter (where kind = 'hide'), '{}'),
           coalesce(array_agg(venue_id) filter (where kind = 'mute_venue'), '{}'),
           coalesce(array_agg(quest_id) filter (where kind = 'save'), '{}'),
           coalesce(array_agg(category) filter (where kind = 'fewer_category'), '{}')
      into v_hidden, v_muted, v_saved, v_fewer
      from public.quest_feedback where user_id = uid;
    select coalesce(array_agg(quest_id), '{}'), coalesce(array_agg(last_at), '{}')
      into v_done_ids, v_done_at
      from (select c.quest_id, max(c.completed_at) as last_at
              from public.quest_completions c where c.user_id = uid
             group by c.quest_id) d;
  end if;

  with cand as (
    -- Two branches so each can use its own GiST index (an index on a
    -- COALESCE across the join would not be usable).
    select q.id as quest_id, q.location_geog as geog
      from public.quests q
     where q.location_geog is not null
       and q.status = 'active'
       and extensions.st_dwithin(q.location_geog, v_origin, v_radius)
    union all
    select q.id, v.geog
      from public.venues v
      join public.quests q on q.venue_id = v.id
     where q.location_latitude is null
       and q.status = 'active'
       and v.geog is not null
       and extensions.st_dwithin(v.geog, v_origin, v_radius)
  ),
  done as (
    select * from unnest(v_done_ids, v_done_at) as d(quest_id, last_at)
  ),
  base as (
    select q, v, q.id, q.category, q.estimated_minutes as est,
           extensions.st_distance(c.geog, v_origin)::numeric as dist_exact,
           round(extensions.st_distance(c.geog, v_origin))::integer as dist,
           public.venue_open_state(v.opening_hours, v.timezone, v_now) as avail,
           d.last_at,
           q.id = any (v_saved) as saved,
           q.category = any (v_fewer) as fewer,
           (q.start_date is not null or q.end_date is not null) as time_boxed
      from cand c
      join public.quests q on q.id = c.quest_id
      left join public.venues v on v.id = q.venue_id
      left join done d on d.quest_id = q.id
     where q.status = 'active'
       and (q.start_date is null or q.start_date <= v_now)
       and (q.end_date is null or q.end_date > v_now)
       and (q.venue_id is null or v.status = 'active')
       and (p_categories is null or cardinality(p_categories) = 0 or q.category = any (p_categories))
       and (p_max_minutes is null or q.estimated_minutes is null or q.estimated_minutes <= p_max_minutes)
       and not (q.id = any (v_hidden))
       and (q.venue_id is null or not (q.venue_id = any (v_muted)))
       and (d.last_at is null
            or (q.repeat_cooldown_days is not null
                and d.last_at + make_interval(days => q.repeat_cooldown_days) <= v_now))
  ),
  parts as (
    select b.*,
           greatest(0, 1 - b.dist_exact / v_radius) as proximity,
           case when b.fewer then 0
                when not v_has_interests then 0.5
                when b.category = any (v_interests) then 1 else 0 end as interest,
           case
             when b.time_boxed and b.est is not null and (b.q).end_date is not null
                  and (b.q).end_date < v_now + make_interval(mins => b.est + 10) then 0.2
             when b.avail ->> 'state' = 'closed' then 0
             when b.avail ->> 'state' = 'open' and b.est is not null then
               case when (b.avail ->> 'closesAt')::timestamptz >= v_now + make_interval(mins => b.est + 10)
                    then 1 else 0.2 end
             else 0.5 end as time_fit,
           case when uid is null then 0.5 when b.last_at is null then 1 else 0.3 end as novelty
      from base b
  ),
  scored as (
    select p.*,
           round(0.35 * p.proximity + 0.25 * p.interest + 0.20 * p.time_fit
                 + 0.10 * p.novelty + 0.10 * (p.q).editorial_quality, 6) as score,
           array_remove(array[
             case when p.dist <= 1000 then 'nearby' end,
             case when p.interest = 1 then 'matches_' || p.category::text || '_interest' end,
             case when p.time_fit = 1 then 'fits_' || p.est || '_minutes' end,
             case when p.saved then 'saved_quest' end,
             case when p.time_boxed then 'event_available' end
           ], null) as reasons
      from parts p
  ),
  page as (
    select s.*
      from scored s
     where p_cursor is null
        or s.score < c_score
        or (s.score = c_score and s.dist > c_dist)
        or (s.score = c_score and s.dist = c_dist and s.id > c_id)
     order by s.score desc, s.dist asc, s.id asc
     limit v_limit + 1
  ),
  numbered as (
    select pg.*, row_number() over (order by pg.score desc, pg.dist asc, pg.id asc) as rn from page pg
  )
  select coalesce(jsonb_agg(public.location_quest_card(n.q, n.v, n.dist, n.avail, n.reasons, n.score)
                            order by n.rn) filter (where n.rn <= v_limit), '[]'::jsonb),
         count(*),
         (select jsonb_build_object('s', n2.score, 'd', n2.dist, 'id', n2.id)
            from numbered n2 where n2.rn = v_limit)
    into v_items, v_count, v_last
    from numbered n;

  if v_count > v_limit and v_last is not null then
    v_next := translate(encode(convert_to((v_last || jsonb_build_object('h', v_hash))::text, 'UTF8'), 'base64'), E'\n', '');
  end if;

  return jsonb_build_object(
    'ok', true,
    'serverTime', v_now,
    'origin', jsonb_build_object('source', p_source, 'areaId', case when p_source = 'area' then p_area_id end,
                                 'label', v_label),
    'items', v_items,
    'nextCursor', v_next
  );
end $$;

revoke all on function public.discover_nearby(double precision, double precision, text, text, integer,
  public.quest_category[], integer, integer, text) from public;
grant execute on function public.discover_nearby(double precision, double precision, text, text, integer,
  public.quest_category[], integer, integer, text) to anon, authenticated;

-- ===========================================================================
-- 8. get_quest_card — fresh state for quest pages and notification taps
-- ===========================================================================
create or replace function public.get_quest_card(p_quest_id uuid)
returns jsonb
language plpgsql stable security invoker set search_path = public, extensions, pg_temp as $$
declare
  uid    uuid := auth.uid();
  v_now  timestamptz := now();
  q      public.quests;
  v      public.venues;
  v_last timestamptz;
  v_state text;
begin
  select * into q from public.quests where id = p_quest_id;
  if not found then
    return jsonb_build_object('ok', true, 'serverTime', v_now, 'state', 'not_found', 'quest', null);
  end if;
  if q.venue_id is not null then
    select * into v from public.venues where id = q.venue_id;
  end if;

  if q.status <> 'active' or (q.start_date is not null and q.start_date > v_now)
     or (q.venue_id is not null and (v.id is null or v.status <> 'active')) then
    return jsonb_build_object('ok', true, 'serverTime', v_now, 'state', 'inactive', 'quest', null);
  end if;

  if q.end_date is not null and q.end_date <= v_now then
    v_state := 'expired';
  else
    if uid is not null then
      select max(completed_at) into v_last
        from public.quest_completions where user_id = uid and quest_id = q.id;
    end if;
    v_state := case
      when v_last is null then 'available'
      when q.repeat_cooldown_days is null then 'completed'
      when v_last + make_interval(days => q.repeat_cooldown_days) > v_now then 'cooldown'
      else 'available' end;
  end if;

  return jsonb_build_object(
    'ok', true, 'serverTime', v_now, 'state', v_state,
    'quest', public.location_quest_card(q, v, null,
               public.venue_open_state(v.opening_hours, v.timezone, v_now), '{}'::text[], null)
  );
end $$;

revoke all on function public.get_quest_card(uuid) from public;
grant execute on function public.get_quest_card(uuid) to anon, authenticated;

-- ===========================================================================
-- 9. Curation check (admins)
-- ===========================================================================
-- Lists active quests whose location data is not ready. Placeholder =
-- within 25 m of a discovery-area centroid (a generic neighborhood pin);
-- outside_market = more than 60 km from every area centroid.
create or replace function public.location_catalog_issues()
returns table (quest_id uuid, title text, issue text)
language plpgsql stable security invoker set search_path = public, extensions, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  with eff as (
    select q.id, q.title, q.nudge_eligible, q.estimated_minutes, q.verification_type,
           q.verification_radius_m, q.location_checked_at as q_checked,
           v.location_checked_at as v_checked, v.timezone, v.opening_hours, q.venue_id,
           case when q.location_latitude is not null then q.location_geog else v.geog end as geog,
           (q.location_latitude is not null or v.latitude is not null or v.longitude is not null) as has_coords
      from public.quests q
      left join public.venues v on v.id = q.venue_id
     where q.status = 'active'
  )
  select e.id, e.title, i.issue
    from eff e
    cross join lateral (values
      (case when not e.has_coords then 'no_location' end),
      (case when e.has_coords and e.geog is null then 'invalid_coordinates' end),
      (case when e.geog is not null and exists (
              select 1 from public.discovery_areas a where extensions.st_dwithin(a.geog, e.geog, 25))
            then 'placeholder_coordinates' end),
      (case when e.geog is not null and not exists (
              select 1 from public.discovery_areas a where extensions.st_dwithin(a.geog, e.geog, 60000))
            then 'outside_market' end),
      (case when coalesce(e.q_checked, e.v_checked) is null then 'location_unchecked' end),
      (case when e.nudge_eligible and e.estimated_minutes is null then 'nudge_missing_duration' end),
      (case when e.nudge_eligible and (e.timezone is null or e.opening_hours is null) then 'nudge_missing_hours' end),
      (case when e.verification_type = 'gps' and e.verification_radius_m is null then 'gps_default_radius' end)
    ) as i(issue)
   where i.issue is not null
   order by e.title, i.issue;
end $$;

revoke all on function public.location_catalog_issues() from public, anon;
grant execute on function public.location_catalog_issues() to authenticated;

commit;

-- Verification (run after applying):
--   select count(*) from public.venues where latitude is not null and geog is null;  -- invalid pins
--   select public.discover_nearby(25.8010, -80.1994, null, 'device', 3000);
--   select public.discover_nearby(null, null, 'wynwood', 'area', 3000);
--   select * from public.location_catalog_issues();   -- as an admin
--   explain analyze ... the cand CTE above: expect idx_venues_geog / idx_quests_location_geog.
--
-- Rollback:
--   begin;
--   drop function if exists public.location_catalog_issues();
--   drop function if exists public.get_quest_card(uuid);
--   drop function if exists public.discover_nearby(double precision, double precision, text, text,
--     integer, public.quest_category[], integer, integer, text);
--   drop function if exists public.location_quest_card(public.quests, public.venues, integer, jsonb, text[], numeric);
--   drop function if exists public.interest_categories(text[]);
--   drop function if exists public.venue_open_state(jsonb, text, timestamptz);
--   drop table if exists public.quest_feedback;
--   drop table if exists public.discovery_areas;
--   alter table public.quests drop column if exists location_geog, drop column if exists location_latitude,
--     drop column if exists location_longitude, drop column if exists location_label,
--     drop column if exists estimated_minutes, drop column if exists access_notes,
--     drop column if exists is_sponsored, drop column if exists nudge_eligible,
--     drop column if exists nudge_radius_m, drop column if exists verification_radius_m,
--     drop column if exists editorial_quality, drop column if exists location_source,
--     drop column if exists location_checked_at;
--   alter table public.venues drop column if exists geog, drop column if exists timezone,
--     drop column if exists opening_hours, drop column if exists location_source,
--     drop column if exists location_checked_at;
--   commit;
--   -- postgis is left installed (other objects may depend on it).
