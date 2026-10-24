-- Query plan + timing for discover_nearby on a synthetic 20k-venue catalog.
-- Informational: reports whether the GiST indexes are used; it does not fail
-- on plan shape (the real catalog and Supabase planner settings will differ).
\ir _helpers.sql
begin;

do $$
declare p uuid := pg_temp.mk_partner('Synthetic Catalog');
begin
  -- ~20k venues spread over a 0.6° × 0.6° box around Miami, one quest each,
  -- plus 2k quests with their own location override.
  insert into public.venues (partner_id, name, latitude, longitude, status, opening_hours, timezone)
  select p, 'Synthetic venue ' || g, 25.50 + random() * 0.6, -80.50 + random() * 0.6, 'active',
         case when g % 3 = 0 then pg_temp.all_day() end, case when g % 3 = 0 then 'America/New_York' end
    from generate_series(1, 20000) g;
  insert into public.quests (partner_id, venue_id, title, category, status, estimated_minutes)
  select p, v.id, 'Synthetic quest ' || v.name,
         (array['art','food','outdoors','culture','nightlife','shopping','fitness','hidden_gem'])[1 + (row_number() over ()) % 8]::public.quest_category,
         'active', 10 + (row_number() over ()) % 50
    from public.venues v where v.partner_id = p;
  insert into public.quests (partner_id, venue_id, title, status, location_latitude, location_longitude)
  select p, null, 'Synthetic landmark ' || g, 'active', 25.50 + random() * 0.6, -80.50 + random() * 0.6
    from generate_series(1, 2000) g;
end $$;
analyze public.venues;
analyze public.quests;

-- The candidate branches exactly as discover_nearby runs them, with the
-- origin/radius as parameters and a forced generic plan (what PL/pgSQL may
-- cache after repeated calls), so index use does not depend on literals.
set local plan_cache_mode = force_generic_plan;
prepare cand(extensions.geography, int) as
  select q.id from public.quests q
   where q.location_geog is not null and q.status = 'active'
     and extensions.st_dwithin(q.location_geog, $1, $2)
  union all
  select q.id from public.venues v join public.quests q on q.venue_id = v.id
   where q.location_latitude is null and q.status = 'active' and v.geog is not null
     and extensions.st_dwithin(v.geog, $1, $2);

do $$
declare line text; plan text := ''; r jsonb; t0 timestamptz; ms numeric; i int;
begin
  for line in execute $q$explain execute cand(
      extensions.st_setsrid(extensions.st_makepoint(-80.20, 25.80), 4326)::extensions.geography, 3000)$q$ loop
    plan := plan || line || E'\n';
  end loop;
  raise notice 'ok - info: venue branch uses idx_venues_geog: %', position('idx_venues_geog' in plan) > 0;
  raise notice 'ok - info: override branch uses idx_quests_location_geog: %', position('idx_quests_location_geog' in plan) > 0;
  raise notice E'plan:\n%', plan;

  t0 := clock_timestamp();
  for i in 1..10 loop
    r := public.discover_nearby(25.80 + i * 0.001, -80.20, null, 'device', 3000);
  end loop;
  ms := extract(epoch from clock_timestamp() - t0) * 1000 / 10;
  raise notice 'ok - info: discover_nearby (3 km, page of %) over ~22k quests: avg % ms/call locally',
    jsonb_array_length(r -> 'items'), round(ms, 1);
  t0 := clock_timestamp();
  for i in 1..10 loop
    r := public.discover_nearby(25.80 + i * 0.001, -80.20, null, 'device', 10000);
  end loop;
  ms := extract(epoch from clock_timestamp() - t0) * 1000 / 10;
  raise notice 'ok - info: discover_nearby (10 km) avg % ms/call locally', round(ms, 1);
end $$;

rollback;
