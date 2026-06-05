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
