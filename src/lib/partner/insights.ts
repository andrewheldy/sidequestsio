/**
 * In-browser twin of the partner_insights RPC (0021) for the Local and Mock
 * repositories. Same inputs, same rules, same output shape: verified scans
 * only, approved notes only, redemptions partner-level only, days bucketed in
 * Miami time, per-source detail withheld for 1–4 visitors.
 */

import type {
  InsightsDay,
  InsightsQuestRow,
  InsightsVenueRow,
  PartnerInsights,
} from "@/lib/db/types";

export interface InsightsEventRecord {
  name: string;
  at: string;
  anonymousId: string | null;
  questId: string | null;
  venueId: string | null;
  partnerId: string | null;
  actionType: string | null;
  source: string | null;
}

export interface InsightsSource {
  partner: { id: string; name: string };
  venue: { id: string; name: string; neighborhood: string | null } | null;
  venues: { id: string; name: string; neighborhood?: string | null }[];
  quests: { id: string; title: string; status: string; venue_id: string | null }[];
  scans: { quest_id: string; venue_id: string | null; timestamp: string; code_verified?: boolean }[];
  completions: { quest_id: string; venue_id: string | null; completed_at: string; points_awarded: number; xp_awarded: number }[];
  redemptions: { redeemed_at: string }[];
  notes: { quest_id: string; moderation_status: string; created_at: string }[];
  events: InsightsEventRecord[];
  days: number;
  now?: Date;
}

const MIAMI_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function miamiDate(value: string | Date): string {
  return MIAMI_DAY.format(typeof value === "string" ? new Date(value) : value);
}

export function buildPartnerInsights(src: InsightsSource): PartnerInsights {
  const now = src.now ?? new Date();
  const days = Math.min(Math.max(Math.round(src.days) || 30, 1), 365);
  const dates = lastDays(now, days);
  const fromDate = dates[0];
  const inWindow = (at: string) => miamiDate(at) >= fromDate;

  const venueId = src.venue?.id ?? null;
  const partnerQuests = src.quests.filter((q) => !venueId || q.venue_id === venueId);
  const questIds = new Set(partnerQuests.map((q) => q.id));

  const ev = src.events.filter(
    (e) =>
      e.partnerId === src.partner.id &&
      (!venueId || e.venueId === venueId) &&
      inWindow(e.at),
  );
  const sc = src.scans.filter(
    (s) => s.code_verified && (!venueId || s.venue_id === venueId) && inWindow(s.timestamp),
  );
  const comp = src.completions.filter(
    (c) => (!venueId || c.venue_id === venueId) && inWindow(c.completed_at),
  );
  const clicks = ev
    .filter((e) => e.name === "quest_optional_action_clicked" || e.name === "venue_website_clicked")
    .map((e) => (e.name === "venue_website_clicked" ? "venue_website" : e.actionType))
    .filter((k): k is string => !!k);

  const loads = ev.filter((e) => e.name === "quest_page_loaded");
  const count = (name: string) => ev.filter((e) => e.name === name).length;
  const visitors = new Set(ev.map((e) => e.anonymousId).filter(Boolean)).size;

  const daysByVisitor = new Map<string, Set<string>>();
  for (const e of ev) {
    if (!e.anonymousId) continue;
    const set = daysByVisitor.get(e.anonymousId) ?? new Set<string>();
    set.add(miamiDate(e.at));
    daysByVisitor.set(e.anonymousId, set);
  }

  const daily: InsightsDay[] = dates.map((date) => ({
    date,
    views: loads.filter((e) => miamiDate(e.at) === date).length,
    scans: sc.filter((s) => miamiDate(s.timestamp) === date).length,
    completions: comp.filter((c) => miamiDate(c.completed_at) === date).length,
  }));

  const venueName = new Map(src.venues.map((v) => [v.id, v.name]));
  const quests: InsightsQuestRow[] = partnerQuests
    .map((q) => ({
      id: q.id,
      title: q.title,
      status: q.status,
      venueId: q.venue_id,
      venueName: q.venue_id ? venueName.get(q.venue_id) ?? null : null,
      views: loads.filter((e) => e.questId === q.id).length,
      starts: ev.filter((e) => e.questId === q.id && e.name === "quest_primary_action_started").length,
      scans: sc.filter((s) => s.quest_id === q.id).length,
      completions: comp.filter((c) => c.quest_id === q.id).length,
    }))
    .sort((a, b) => b.completions - a.completions || b.views - a.views || a.title.localeCompare(b.title));

  const venues: InsightsVenueRow[] = venueId
    ? []
    : src.venues
        .map((v) => ({
          id: v.id,
          name: v.name,
          neighborhood: v.neighborhood ?? null,
          views: loads.filter((e) => e.venueId === v.id).length,
          scans: sc.filter((s) => s.venue_id === v.id).length,
          completions: comp.filter((c) => c.venue_id === v.id).length,
        }))
        .sort((a, b) => b.completions - a.completions || b.views - a.views || a.name.localeCompare(b.name));

  const suppressed = visitors >= 1 && visitors <= 4;

  return {
    partner: src.partner,
    venue: src.venue,
    range: { days, from: `${fromDate}T00:00:00`, to: now.toISOString() },
    suppressed,
    totals: {
      pageViews: loads.length,
      uniqueVisitors: visitors,
      repeatVisitors: [...daysByVisitor.values()].filter((d) => d.size > 1).length,
      scans: sc.length,
      actionViews: count("quest_primary_action_viewed"),
      actionClicks: count("quest_primary_action_clicked"),
      actionStarts: count("quest_primary_action_started"),
      completions: comp.length,
      pointsAwarded: comp.reduce((n, c) => n + c.points_awarded, 0),
      xpAwarded: comp.reduce((n, c) => n + c.xp_awarded, 0),
      websiteClicks: clicks.filter((k) => k === "website" || k === "venue_website").length,
      reviewClicks: clicks.filter((k) => k === "google_review" || k === "review").length,
      socialClicks: clicks.filter((k) => ["instagram", "tiktok", "x", "socials"].includes(k)).length,
      rewardsRedeemed: venueId ? null : src.redemptions.filter((r) => inWindow(r.redeemed_at)).length,
      communityNotes: src.notes.filter(
        (n) => questIds.has(n.quest_id) && n.moderation_status === "approved" && inWindow(n.created_at),
      ).length,
    },
    daily,
    quests,
    venues,
    engagement: tally(clicks).map(([type, n]) => ({ type, clicks: n })),
    sources: suppressed
      ? []
      : tally(
          [...new Map(loads.map((e) => [`${e.anonymousId}|${e.source ?? "unknown"}`, e.source || "unknown"])).values()],
        ).map(([source, n]) => ({ source, visitors: n })),
    generatedAt: now.toISOString(),
  };
}

/** The last `days` Miami calendar dates, oldest first, today included. */
function lastDays(now: Date, days: number): string[] {
  // Calendar arithmetic on the Miami date (DST-safe), not 24h steps.
  const [y, m, d] = miamiDate(now).split("-").map(Number);
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10));
  }
  return out;
}

function tally(values: string[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
