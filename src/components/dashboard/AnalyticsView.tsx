import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Lock } from "lucide-react";
import { MetricCard } from "./DashboardLayout";
import type { AnalyticsSummary } from "@/lib/db/types";

/**
 * Privacy-safe aggregate analytics (Phase 11). Renders only counts and rates —
 * never individual users, emails, or precise locations. Small samples are
 * suppressed upstream and surfaced here as a notice.
 */
export default function AnalyticsView({ data }: { data: AnalyticsSummary }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Total scans" value={data.totalScans} />
        <MetricCard label="Unique visitors" value={data.uniqueVisitors} />
        <MetricCard label="Authenticated" value={data.authenticatedVisitors} />
        <MetricCard
          label="Conversion"
          value={`${Math.round(data.conversionRate * 100)}%`}
          hint="scan → completion"
        />
        <MetricCard label="Completions" value={data.completions} />
        <MetricCard label="Rewards redeemed" value={data.rewardsRedeemed} />
        <MetricCard label="Community Notes" value={data.communityNotes} />
        <MetricCard
          label="Drop-off"
          value={data.totalScans - data.completions}
          hint="scanned, not completed"
        />
      </div>

      {data.suppressed && (
        <div className="glass-card flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" /> Some breakdowns are hidden until there are
          enough scans to protect visitor privacy.
        </div>
      )}

      <div className="glass-card p-4">
        <h3 className="mb-3 font-poppins font-semibold text-foreground">Scans by day</h3>
        {data.scansByDay.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No scan data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.scansByDay}>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="value" fill="hsl(var(--coral))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {!data.suppressed && (
        <div className="grid gap-4 md:grid-cols-2">
          <BreakdownCard title="Scans by quest" rows={data.scansByQuest} />
          <BreakdownCard title="Scans by venue" rows={data.scansByVenue} />
        </div>
      )}
    </div>
  );
}

function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; label: string; value: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="glass-card p-4">
      <h3 className="mb-3 font-poppins font-semibold text-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-foreground">{r.label}</span>
                <span className="text-muted-foreground">{r.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-secondary"
                  style={{ width: `${(r.value / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
