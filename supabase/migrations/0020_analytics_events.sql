-- 0020_analytics_events.sql — append-only product analytics events
--
-- WHY: the quest page now emits a defined event catalogue (src/types/events.ts;
-- src/lib/analytics/questEvents.ts) meant to feed partner reporting — quest
-- impressions → starts → completions, Explore & Share clicks, website and
-- review clicks, rewards offered vs earned. Nothing in the schema can hold it:
--   * scan_events  — scans only, one row per QR/NFC/page-view scan;
--   * analytics_rollups — daily aggregates (a future *output* of this table);
--   * audit_logs   — admin actions.
-- Until now events only reached a localStorage ring buffer on the device.
--
-- Design
--   * One generic, append-only table. Nullable FKs to quests / venues /
--     partners (ON DELETE SET NULL, so history survives content cleanup);
--     nav clicks and failed page loads legitimately have no quest.
--   * campaign_id / activation_id are plain uuid columns: there is no
--     campaigns table yet. Add FKs in the migration that creates one.
--   * Writes only through record_analytics_events(jsonb) — no insert grant on
--     the table. The RPC never trusts client attribution: user_id comes from
--     the JWT, venue_id/partner_id are re-derived from the quest row. Client
--     values are only used for events that have no quest (e.g. nav clicks),
--     and only when they reference a real venue/partner.
--   * Reads: partners see rows for their own partner_id, admins see all
--     (owns_partner() already includes admins). No anon reads.
--   * No precise location, no email, no free text beyond the bounded
--     `properties` bag (≤ 4 KB per event).
--
-- The client sink (src/lib/analytics/supabaseSink.ts) is off unless the build
-- sets VITE_ANALYTICS_SINK=supabase, and even then only sends for visitors who
-- opted into analytics cookies.
--
-- Depends on 0016 (owns_partner / app_uid as SECURITY DEFINER).
-- Idempotent. Reverse with:
--   drop function if exists public.record_analytics_events(jsonb);
--   drop table if exists public.analytics_events;

begin;

create table if not exists public.analytics_events (
  id            bigint generated always as identity primary key,
  event_name    text        not null check (event_name ~ '^[a-z][a-z0-9_]{2,63}$'),
  occurred_at   timestamptz not null,                 -- client clock, clamped by the RPC
  received_at   timestamptz not null default now(),
  user_id       uuid references public.users(id)    on delete set null,
  anonymous_id  text check (char_length(anonymous_id) <= 64),
  session_id    text check (char_length(session_id)   <= 64),
  quest_id      uuid references public.quests(id)   on delete set null,
  venue_id      uuid references public.venues(id)   on delete set null,
  partner_id    uuid references public.partners(id) on delete set null,
  campaign_id   uuid,
  activation_id uuid,
  action_id     text check (char_length(action_id)   <= 64),
  action_type   text check (char_length(action_type) <= 32),
  tracking_id   text check (char_length(tracking_id) <= 96),
  page_path     text check (char_length(page_path)   <= 256),
  device_type   text check (device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  properties    jsonb not null default '{}'::jsonb
);

comment on table public.analytics_events is
  'Append-only product analytics events (quest page funnel, Explore & Share clicks, nav). Written only via record_analytics_events().';

-- Partner dashboard access paths.
create index if not exists analytics_events_partner_time_idx
  on public.analytics_events (partner_id, occurred_at desc);
create index if not exists analytics_events_quest_event_time_idx
  on public.analytics_events (quest_id, event_name, occurred_at desc);
create index if not exists analytics_events_venue_time_idx
  on public.analytics_events (venue_id, occurred_at desc);
create index if not exists analytics_events_campaign_time_idx
  on public.analytics_events (campaign_id, occurred_at desc) where campaign_id is not null;
create index if not exists analytics_events_name_time_idx
  on public.analytics_events (event_name, occurred_at desc);

alter table public.analytics_events enable row level security;

drop policy if exists analytics_events_owner_read on public.analytics_events;
create policy analytics_events_owner_read on public.analytics_events
  for select to authenticated
  using ((partner_id is not null and public.owns_partner(partner_id)) or public.is_admin());

-- Reads for partners/admins; no insert/update/delete grants (RPC only).
revoke all on table public.analytics_events from anon, authenticated;
grant select on table public.analytics_events to authenticated;

-- ---------------------------------------------------------------------------
-- record_analytics_events(p_events jsonb) — batch insert, max 50 per call.
-- Each element: { name, timestamp, anonymous_session_id, session_id, quest_id,
-- venue_id, partner_id, campaign_id, activation_id, action_id, action_type,
-- tracking_id, page_path, device_type, props }. Invalid elements are skipped,
-- never raised, so one bad event can't drop a batch. Returns rows inserted.
-- ---------------------------------------------------------------------------
create or replace function public.record_analytics_events(p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := public.app_uid();
  v_event    jsonb;
  v_quest    public.quests%rowtype;
  v_quest_id uuid;
  v_venue_id uuid;
  v_partner  uuid;
  v_at       timestamptz;
  v_props    jsonb;
  v_count    integer := 0;
  c_uuid     constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  if jsonb_typeof(p_events) <> 'array' then
    return 0;
  end if;

  for v_event in select value from jsonb_array_elements(p_events) limit 50 loop
    continue when jsonb_typeof(v_event) <> 'object';
    continue when coalesce(v_event->>'name', '') !~ '^[a-z][a-z0-9_]{2,63}$';

    -- Attribution comes from the quest row when there is one.
    v_quest_id := null; v_venue_id := null; v_partner := null;
    if coalesce(v_event->>'quest_id', '') ~ c_uuid then
      select * into v_quest from public.quests where id = (v_event->>'quest_id')::uuid;
      if found then
        v_quest_id := v_quest.id;
        v_venue_id := v_quest.venue_id;
        v_partner  := v_quest.partner_id;
      end if;
    end if;
    if v_quest_id is null then
      if coalesce(v_event->>'venue_id', '') ~ c_uuid then
        select id, partner_id into v_venue_id, v_partner
          from public.venues where id = (v_event->>'venue_id')::uuid;
      end if;
      if v_partner is null and coalesce(v_event->>'partner_id', '') ~ c_uuid then
        select id into v_partner from public.partners where id = (v_event->>'partner_id')::uuid;
      end if;
    end if;

    -- Client clock, clamped to a sane window around server time.
    begin
      v_at := (v_event->>'timestamp')::timestamptz;
    exception when others then
      v_at := now();
    end;
    if v_at is null or v_at > now() + interval '5 minutes' or v_at < now() - interval '2 days' then
      v_at := now();
    end if;

    v_props := case when jsonb_typeof(v_event->'props') = 'object' then v_event->'props' else '{}'::jsonb end;
    if v_event ? 'viewport_width' then
      v_props := v_props || jsonb_build_object('viewport_width', v_event->'viewport_width');
    end if;
    if pg_column_size(v_props) > 4096 then
      v_props := jsonb_build_object('truncated', true);
    end if;

    insert into public.analytics_events (
      event_name, occurred_at, user_id, anonymous_id, session_id,
      quest_id, venue_id, partner_id, campaign_id, activation_id,
      action_id, action_type, tracking_id, page_path, device_type, properties
    ) values (
      v_event->>'name',
      v_at,
      v_uid,
      left(v_event->>'anonymous_session_id', 64),
      left(v_event->>'session_id', 64),
      v_quest_id,
      v_venue_id,
      v_partner,
      case when coalesce(v_event->>'campaign_id', '') ~ c_uuid then (v_event->>'campaign_id')::uuid end,
      case when coalesce(v_event->>'activation_id', '') ~ c_uuid then (v_event->>'activation_id')::uuid end,
      left(v_event->>'action_id', 64),
      left(v_event->>'action_type', 32),
      left(v_event->>'tracking_id', 96),
      left(v_event->>'page_path', 256),
      case when v_event->>'device_type' in ('mobile', 'tablet', 'desktop', 'unknown')
           then v_event->>'device_type' else 'unknown' end,
      v_props
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.record_analytics_events(jsonb) from public;
grant execute on function public.record_analytics_events(jsonb) to anon, authenticated;

commit;

-- Verification:
--   select count(*) from information_schema.tables
--    where table_schema = 'public' and table_name = 'analytics_events';   -- 1
--   select relrowsecurity from pg_class where oid = 'public.analytics_events'::regclass;  -- true
--   select public.record_analytics_events('[{"name":"quest_page_viewed","timestamp":"now"}]'::jsonb);  -- 1
--   select has_table_privilege('anon', 'public.analytics_events', 'insert');  -- false
