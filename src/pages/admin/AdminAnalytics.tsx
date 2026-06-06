import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ADMIN_NAV } from "@/components/dashboard/navs";
import AnalyticsView from "@/components/dashboard/AnalyticsView";
import { SimpleTable } from "@/components/dashboard/SimpleTable";
import { Loading } from "@/components/app/ui";
import { cn } from "@/lib/utils";
import { getRepository } from "@/lib/db";

type Tab = "analytics" | "scans" | "audit";

export default function AdminAnalytics() {
  const [tab, setTab] = useState<Tab>("analytics");

  const { data: analytics, isLoading: la } = useQuery({
    queryKey: ["platform-analytics"],
    queryFn: async () => (await getRepository()).getPlatformAnalytics(),
  });
  const { data: scans = [] } = useQuery({
    queryKey: ["admin-scans"],
    queryFn: async () => (await getRepository()).listScans({ limit: 100 }),
  });
  const { data: audit = [] } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: async () => (await getRepository()).listAudit(100),
  });

  return (
    <DashboardLayout title="Admin" nav={ADMIN_NAV}>
      <h1 className="mb-4 font-poppins text-2xl font-bold text-foreground">
        Analytics & Inspection
      </h1>
      <div className="mb-6 flex gap-2">
        {(["analytics", "scans", "audit"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium capitalize",
              tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "analytics" &&
        (la || !analytics ? <Loading /> : <AnalyticsView data={analytics} />)}

      {tab === "scans" && (
        <SimpleTable
          rows={scans}
          keyOf={(s) => s.id}
          empty="No scan events yet."
          columns={[
            { header: "Time", cell: (s) => new Date(s.timestamp).toLocaleString() },
            { header: "Quest", cell: (s) => s.quest_id },
            { header: "Device", cell: (s) => <span className="capitalize">{s.device_type}</span> },
            { header: "Browser", cell: (s) => s.browser },
            { header: "User", cell: (s) => (s.user_id ? "auth" : "anon") },
            { header: "State", cell: (s) => <span className="capitalize">{s.conversion_state}</span> },
          ]}
        />
      )}

      {tab === "audit" && (
        <SimpleTable
          rows={audit}
          keyOf={(a) => a.id}
          empty="No audit entries yet."
          columns={[
            { header: "Time", cell: (a) => new Date(a.created_at).toLocaleString() },
            { header: "Actor", cell: (a) => a.actor_id ?? "system" },
            { header: "Action", cell: (a) => a.action },
            { header: "Entity", cell: (a) => `${a.entity_type}${a.entity_id ? `:${a.entity_id}` : ""}` },
          ]}
        />
      )}
    </DashboardLayout>
  );
}
