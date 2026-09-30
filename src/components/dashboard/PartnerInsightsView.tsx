import { useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronRight, Info, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricCard } from "./DashboardLayout";
import type { InsightsDay, PartnerInsights } from "@/lib/db/types";

/**
 * Partner / venue insights (partner_insights RPC, 0021). Aggregate-only: every
 * figure is a count or rate — no visitors, emails or locations are shown.
 *
 * Chart choices: headline numbers are stat tiles; the funnel is an ordered
 * single-hue bar list; the daily trend is ONE series at a time (views, scans
 * and completions live on different scales, so no shared or dual axis).
 */

const BAR = "hsl(var(--ocean-500))"; // validated: contrast ≥ 3:1 on white/sand surfaces

const ENGAGEMENT_LABEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  google_review: "Google Review",
  review: "Reviews",
  website: "Website (Explore & Share)",
  venue_website: "Website (venue card)",
  socials: "All links",
};

const SOURCE_LABEL: Record<string, string> = {
  qr: "QR code scan",
  nfc: "NFC tag tap",
  scan: "Venue code",
  scan_link: "Scan link",
  in_app: "Inside the app",
  external: "Other websites",
  direct: "Direct / typed",
  unknown: "Unknown",
};

export default function PartnerInsightsView({
  data,
  venueHref,
}: {
  data: PartnerInsights;
  /** Builds the link to a venue's own dashboard (keeps partner/range params). */
  venueHref: (venueId: string) => string;
}) {
  const t = data.totals;
  const isVenue = !!data.venue;

  return (
    <div className="space-y-6">
      <section aria-label="Headline numbers" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Quest page views" value={fmt(t.pageViews)} hint={`${fmt(t.uniqueVisitors)} visitors`} />
        <MetricCard label="Verified check-ins" value={fmt(t.scans)} hint="QR / NFC scans at the venue" />
        <MetricCard label="Quests completed" value={fmt(t.completions)} hint={`${fmt(t.pointsAwarded)} points · ${fmt(t.xpAwarded)} XP issued`} />
        <MetricCard label="Repeat visitors" value={fmt(t.repeatVisitors)} hint="came back on another day" />
        <MetricCard label="Website clicks" value={fmt(t.websiteClicks)} />
        <MetricCard label="Review clicks" value={fmt(t.reviewClicks)} hint="Google & other reviews" />
        <MetricCard label="Social clicks" value={fmt(t.socialClicks)} hint="Instagram · TikTok · X" />
        {isVenue ? (
          <MetricCard label="Community Notes" value={fmt(t.communityNotes)} hint="approved tips" />
        ) : (
          <MetricCard label="Rewards redeemed" value={fmt(t.rewardsRedeemed ?? 0)} hint={`${fmt(t.communityNotes)} Community Notes`} />
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card title="Quest funnel" className="lg:col-span-2">
          <Funnel
            steps={[
              { label: "Viewed the quest page", value: t.pageViews },
              { label: "Saw the quest challenge", value: t.actionViews },
              { label: "Tapped Complete / Scan", value: t.actionClicks },
              { label: "Started completing", value: t.actionStarts },
              { label: "Completed", value: t.completions, note: "all visitors" },
            ]}
          />
        </Card>
        <Card title="Daily activity" className="lg:col-span-3">
          <DailyChart days={data.daily} />
        </Card>
      </div>

      {!isVenue && (
        <Card title="Venues" subtitle="Open a venue for its own dashboard.">
          {data.venues.length === 0 ? (
            <Empty>No venues yet.</Empty>
          ) : (
            <Table
              head={["Venue", "Views", "Check-ins", "Completed"]}
              rows={data.venues.map((v) => [
                <Link key="n" to={venueHref(v.id)} className="group inline-flex items-center gap-1 font-medium text-foreground hover:text-[hsl(var(--ocean-700))]">
                  <span>
                    {v.name}
                    {v.neighborhood && <span className="block text-xs font-normal text-muted-foreground">{v.neighborhood}</span>}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:translate-x-0.5" aria-hidden />
                </Link>,
                fmt(v.views),
                fmt(v.scans),
                fmt(v.completions),
              ])}
            />
          )}
        </Card>
      )}

      <Card title="Quests">
        {data.quests.length === 0 ? (
          <Empty>No quests here yet.</Empty>
        ) : (
          <Table
            head={["Quest", "Views", "Started", "Check-ins", "Completed"]}
            rows={data.quests.map((q) => [
              <span key="q" className="font-medium text-foreground">
                {q.title}
                <span className="block text-xs font-normal text-muted-foreground">
                  {[!isVenue && q.venueName, q.status !== "active" && q.status].filter(Boolean).join(" · ")}
                </span>
              </span>,
              fmt(q.views),
              fmt(q.starts),
              fmt(q.scans),
              fmt(q.completions),
            ])}
          />
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Explore & Share clicks" subtitle="Taps from the quest page to your channels.">
          <BarList
            rows={data.engagement.map((e) => ({ label: ENGAGEMENT_LABEL[e.type] ?? e.type, value: e.clicks }))}
            empty="No clicks yet."
          />
        </Card>
        <Card title="How visitors arrived" subtitle="Unique visitors by entry point.">
          {data.suppressed ? (
            <p className="flex items-start gap-2 py-4 text-sm text-muted-foreground">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Hidden until at least 5 visitors, to protect their privacy.
            </p>
          ) : (
            <BarList
              rows={data.sources.map((s) => ({ label: SOURCE_LABEL[s.source] ?? s.source, value: s.visitors }))}
              empty="No visits yet."
            />
          )}
        </Card>
      </div>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Views, visitors, funnel steps and clicks count visitors who accepted analytics cookies. Check-ins,
        completions, points, rewards and notes are complete counts, so completions can exceed page views.
        Days are in Miami time. No individual visitor data is shown.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Funnel({ steps }: { steps: { label: string; value: number; note?: string }[] }) {
  const top = Math.max(1, steps[0]?.value ?? 0);
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <ol className="space-y-3">
      {steps.map((s) => {
        const pct = steps[0].value > 0 && s.value <= steps[0].value ? Math.round((s.value / top) * 100) : null;
        return (
          <li key={s.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-foreground">
                {s.label}
                {s.note && <span className="ml-1 text-xs text-muted-foreground">({s.note})</span>}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{fmt(s.value)}</span>
                {pct !== null && <span className="ml-1.5">{pct}%</span>}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted" title={`${s.label}: ${fmt(s.value)}`}>
              <div className="h-full rounded-full" style={{ width: `${(s.value / max) * 100}%`, background: BAR }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const METRICS: { key: keyof Omit<InsightsDay, "date">; label: string }[] = [
  { key: "views", label: "Page views" },
  { key: "scans", label: "Check-ins" },
  { key: "completions", label: "Completions" },
];

function DailyChart({ days }: { days: InsightsDay[] }) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("views");
  const label = METRICS.find((m) => m.key === metric)!.label;
  const total = days.reduce((n, d) => n + d[metric], 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div role="radiogroup" aria-label="Metric" className="inline-flex rounded-lg bg-muted p-0.5">
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={metric === m.key}
              onClick={() => setMetric(m.key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                metric === m.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {fmt(total)} {label.toLowerCase()} in this period
        </span>
      </div>
      {total === 0 ? (
        <Empty>No {label.toLowerCase()} in this period yet.</Empty>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={days} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              minTickGap={24}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))" }}
              labelFormatter={(d) => longDate(String(d))}
              formatter={(v: number) => [fmt(v), label]}
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey={metric} name={label} fill={BAR} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function BarList({ rows, empty }: { rows: { label: string; value: number }[]; empty: string }) {
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="text-foreground">{r.label}</span>
            <span className="tabular-nums font-semibold text-foreground">{fmt(r.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: BAR }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            {head.map((h, i) => (
              <th key={h} scope="col" className={cn("pb-2 font-medium", i > 0 && "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, r) => (
            <tr key={r} className="border-b border-border/50 last:border-0">
              {cells.map((c, i) => (
                <td key={i} className={cn("py-2.5", i > 0 && "text-right tabular-nums text-foreground")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Card({ title, subtitle, className, children }: { title: string; subtitle?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("glass-card p-4", className)} aria-label={title}>
      <h2 className="font-poppins font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

const fmt = (n: number) => n.toLocaleString("en-US");
const shortDate = (d: string) => {
  const [, m, day] = d.split("-").map(Number);
  return `${m}/${day}`;
};
const longDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
