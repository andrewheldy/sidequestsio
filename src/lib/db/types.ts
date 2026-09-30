/**
 * Shared analytics view-models used by partner & admin dashboards (Phase 11).
 * All figures are aggregate-only and respect small-sample suppression.
 */

export interface TimeSeriesPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface NamedCount {
  id: string;
  label: string;
  value: number;
}

export interface AnalyticsSummary {
  totalScans: number;
  uniqueVisitors: number;
  authenticatedVisitors: number;
  completions: number;
  conversionRate: number; // completions / scans (0..1)
  rewardsRedeemed: number;
  communityNotes: number;
  scansByDay: TimeSeriesPoint[];
  scansByQuest: NamedCount[];
  scansByVenue: NamedCount[];
  /** True when results were suppressed because the sample was too small. */
  suppressed: boolean;
}

/** Below this many scans we suppress per-segment detail to protect privacy. */
export const SMALL_SAMPLE_THRESHOLD = 5;

// ---------------------------------------------------------------------------
// Partner & venue insights (partner_insights RPC, migration 0021)
// ---------------------------------------------------------------------------

export interface InsightsTotals {
  /** Quest pages rendered (consented visitors only). */
  pageViews: number;
  uniqueVisitors: number;
  /** Visitors seen on 2+ different days in the window. */
  repeatVisitors: number;
  /** Code-verified QR/NFC scans (complete count). */
  scans: number;
  actionViews: number;
  actionClicks: number;
  actionStarts: number;
  /** Server-accepted completions (complete count). */
  completions: number;
  pointsAwarded: number;
  xpAwarded: number;
  websiteClicks: number;
  reviewClicks: number;
  socialClicks: number;
  /** Partner-level only; null on a venue view (redemptions have no venue). */
  rewardsRedeemed: number | null;
  communityNotes: number;
}

export interface InsightsDay {
  date: string; // YYYY-MM-DD, Miami time
  views: number;
  scans: number;
  completions: number;
}

export interface InsightsQuestRow {
  id: string;
  title: string;
  status: string;
  venueId: string | null;
  venueName: string | null;
  views: number;
  starts: number;
  scans: number;
  completions: number;
}

export interface InsightsVenueRow {
  id: string;
  name: string;
  neighborhood: string | null;
  views: number;
  scans: number;
  completions: number;
}

export interface PartnerInsights {
  partner: { id: string; name: string };
  venue: { id: string; name: string; neighborhood: string | null } | null;
  range: { days: number; from: string; to: string };
  /** 1–4 visitors in the window: per-source detail withheld. */
  suppressed: boolean;
  totals: InsightsTotals;
  daily: InsightsDay[];
  quests: InsightsQuestRow[];
  /** Partner view only; empty on a venue view. */
  venues: InsightsVenueRow[];
  engagement: { type: string; clicks: number }[];
  sources: { source: string; visitors: number }[];
  generatedAt: string;
}

export interface PartnerInsightsInput {
  partnerId: string;
  venueId?: string | null;
  days: number;
}
