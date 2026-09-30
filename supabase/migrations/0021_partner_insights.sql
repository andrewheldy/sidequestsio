-- 0021_partner_insights.sql — partner & venue insights dashboard data
--
-- WHY: partners (and admins on their behalf) get a read-only analytics
-- dashboard per partner and per venue (docs/DECISIONS.md, 2026-09-30). The
-- 0003 partner_analytics() RPC only counts scans; this adds one function that
-- combines the quest-page events from 0020 with the ledger-grade tables:
--   analytics_events   → page views, visitors, repeat visitors, funnel steps,
--                         Explore & Share / website / review clicks, sources
--   scan_events        → verified venue-code scans (QR / NFC)
--   quest_completions  → completions, points and XP issued (source of truth)
--   reward_redemptions → redemptions (partner-level only: no venue column)
--   community_notes    → approved notes on the partner's quests
--
-- Access: owns_partner(p_partner_id) — the partner's owner account, or any
-- admin (0016). A venue filter must belong to that partner. Output is
-- aggregate-only: no user ids, emails, anonymous ids or locations. When a
-- window has 1–4 visitors the per-source breakdown is withheld.
--
-- Visitor/funnel counts only include people who accepted analytics cookies;
-- scans, completions, redemptions and notes are complete counts.
--
-- Depends on 0016 (owns_partner), 0018 (scan_events.code_verified), 0020
-- (analytics_events). Idempotent. Reverse with:
--   drop function if exists public.partner_insights(uuid, uuid, integer);

create or replace function public.partner_insights(
  p_partner_id uuid,
  p_venue_id   uuid    default null,
  p_days       integer default 30
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_partner    public.partners%rowtype;
  v_venue      public.venues%rowtype;
  v_days       integer := least(greatest(coalesce(p_days, 30), 1), 365);
  -- Window = the last v_days calendar days in Miami time, today included.
  v_from       timestamptz := (((now() at time zone 'America/New_York')::date - (v_days - 1))::timestamp
                               at time zone 'America/New_York');
  v_visitors   integer;
  v_result     jsonb;
begin
  if p_partner_id is null or not public.owns_partner(p_partner_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_partner from public.partners where id = p_partner_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if p_venue_id is not null then
    select * into v_venue from public.venues where id = p_venue_id and partner_id = p_partner_id;
    if not found then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;

  select count(distinct e.anonymous_id) into v_visitors
    from public.analytics_events e
   where e.partner_id = p_partner_id
     and (p_venue_id is null or e.venue_id = p_venue_id)
     and e.occurred_at >= v_from;

  with
  ev as (
    select e.event_name, e.occurred_at, e.anonymous_id, e.quest_id, e.venue_id,
           e.action_type, e.properties
      from public.analytics_events e
     where e.partner_id = p_partner_id
       and (p_venue_id is null or e.venue_id = p_venue_id)
       and e.occurred_at >= v_from
  ),
  sc as (
    select s.quest_id, s.venue_id, s."timestamp" as at
      from public.scan_events s
     where s.partner_id = p_partner_id
       and (p_venue_id is null or s.venue_id = p_venue_id)
       and s."timestamp" >= v_from
       and coalesce(s.code_verified, false)
  ),
  comp as (
    select c.quest_id, c.venue_id, c.completed_at as at, c.points_awarded, c.xp_awarded
      from public.quest_completions c
     where c.partner_id = p_partner_id
       and (p_venue_id is null or c.venue_id = p_venue_id)
       and c.completed_at >= v_from
  ),
  clicks as (
    select case when event_name = 'venue_website_clicked' then 'venue_website' else action_type end as kind
      from ev
     where event_name in ('quest_optional_action_clicked', 'venue_website_clicked')
  )
  select jsonb_build_object(
    'partner', jsonb_build_object('id', v_partner.id, 'name', v_partner.name),
    'venue', case when p_venue_id is null then null
                  else jsonb_build_object('id', v_venue.id, 'name', v_venue.name,
                                          'neighborhood', v_venue.neighborhood) end,
    'range', jsonb_build_object('days', v_days, 'from', v_from, 'to', now()),
    'suppressed', v_visitors between 1 and 4,
    'totals', jsonb_build_object(
      'pageViews',      (select count(*) from ev where event_name = 'quest_page_loaded'),
      'uniqueVisitors', v_visitors,
      'repeatVisitors', (select count(*) from (
                           select anonymous_id from ev where anonymous_id is not null
                            group by anonymous_id
                           having count(distinct (occurred_at at time zone 'America/New_York')::date) > 1
                         ) r),
      'scans',          (select count(*) from sc),
      'actionViews',    (select count(*) from ev where event_name = 'quest_primary_action_viewed'),
      'actionClicks',   (select count(*) from ev where event_name = 'quest_primary_action_clicked'),
      'actionStarts',   (select count(*) from ev where event_name = 'quest_primary_action_started'),
      'completions',    (select count(*) from comp),
      'pointsAwarded',  (select coalesce(sum(points_awarded), 0) from comp),
      'xpAwarded',      (select coalesce(sum(xp_awarded), 0) from comp),
      'websiteClicks',  (select count(*) from clicks where kind in ('website', 'venue_website')),
      'reviewClicks',   (select count(*) from clicks where kind in ('google_review', 'review')),
      'socialClicks',   (select count(*) from clicks where kind in ('instagram', 'tiktok', 'x', 'socials')),
      'rewardsRedeemed', case when p_venue_id is null then (
                           select count(*) from public.reward_redemptions r
                            where r.partner_id = p_partner_id and r.redeemed_at >= v_from
                         ) else null end,
      'communityNotes', (select count(*) from public.community_notes n
                           join public.quests q on q.id = n.quest_id
                          where q.partner_id = p_partner_id
                            and (p_venue_id is null or q.venue_id = p_venue_id)
                            and n.moderation_status = 'approved'
                            and n.created_at >= v_from)
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'date', d::date,
               'views', (select count(*) from ev
                          where event_name = 'quest_page_loaded'
                            and (occurred_at at time zone 'America/New_York')::date = d::date),
               'scans', (select count(*) from sc where (at at time zone 'America/New_York')::date = d::date),
               'completions', (select count(*) from comp where (at at time zone 'America/New_York')::date = d::date)
             ) order by d), '[]'::jsonb)
        from generate_series((v_from at time zone 'America/New_York')::date,
                             (now() at time zone 'America/New_York')::date,
                             interval '1 day') d
    ),
    'quests', (
      select coalesce(jsonb_agg(row order by (row->>'completions')::int desc,
                                             (row->>'views')::int desc,
                                             row->>'title'), '[]'::jsonb)
        from (
          select jsonb_build_object(
                   'id', q.id, 'title', q.title, 'status', q.status,
                   'venueId', v.id, 'venueName', v.name,
                   'views', (select count(*) from ev where ev.quest_id = q.id and event_name = 'quest_page_loaded'),
                   'starts', (select count(*) from ev where ev.quest_id = q.id and event_name = 'quest_primary_action_started'),
                   'scans', (select count(*) from sc where sc.quest_id = q.id),
                   'completions', (select count(*) from comp where comp.quest_id = q.id)
                 ) as row
            from public.quests q
            left join public.venues v on v.id = q.venue_id
           where q.partner_id = p_partner_id
             and (p_venue_id is null or q.venue_id = p_venue_id)
        ) t
    ),
    'venues', case when p_venue_id is not null then '[]'::jsonb else (
      select coalesce(jsonb_agg(row order by (row->>'completions')::int desc,
                                             (row->>'views')::int desc,
                                             row->>'name'), '[]'::jsonb)
        from (
          select jsonb_build_object(
                   'id', v.id, 'name', v.name, 'neighborhood', v.neighborhood,
                   'views', (select count(*) from ev where ev.venue_id = v.id and event_name = 'quest_page_loaded'),
                   'scans', (select count(*) from sc where sc.venue_id = v.id),
                   'completions', (select count(*) from comp where comp.venue_id = v.id)
                 ) as row
            from public.venues v
           where v.partner_id = p_partner_id
        ) t
    ) end,
    'engagement', (
      select coalesce(jsonb_agg(jsonb_build_object('type', kind, 'clicks', n) order by n desc), '[]'::jsonb)
        from (select kind, count(*) as n from clicks where kind is not null group by kind) t
    ),
    'sources', case when v_visitors between 1 and 4 then '[]'::jsonb else (
      select coalesce(jsonb_agg(jsonb_build_object('source', src, 'visitors', n) order by n desc), '[]'::jsonb)
        from (
          select coalesce(nullif(properties->>'source', ''), 'unknown') as src,
                 count(distinct anonymous_id) as n
            from ev
           where event_name = 'quest_page_loaded'
           group by 1
        ) t
    ) end,
    'generatedAt', now()
  ) into v_result;

  return v_result;
end;
$$;

comment on function public.partner_insights(uuid, uuid, integer) is
  'Aggregate partner/venue insights for the partner dashboard. owns_partner() gated; no per-user data.';

revoke all on function public.partner_insights(uuid, uuid, integer) from public, anon;
grant execute on function public.partner_insights(uuid, uuid, integer) to authenticated;

-- Verification (as an admin, in the SQL editor use a partner id):
--   select public.partner_insights('<partner uuid>'::uuid, null, 30);
--   select has_function_privilege('anon', 'public.partner_insights(uuid,uuid,integer)', 'execute');  -- false
