import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import DashboardLayout, { MetricCard } from "@/components/dashboard/DashboardLayout";
import { ADMIN_NAV } from "@/components/dashboard/navs";
import { getRepository } from "@/lib/db";

export default function AdminHome() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const repo = await getRepository();
      const [users, partners, quests, rewards, analytics, pending] = await Promise.all([
        repo.listUsers(),
        repo.listPartners(),
        repo.listQuests(),
        repo.listRewards(),
        repo.getPlatformAnalytics(),
        repo.listNotesForModeration("pending"),
      ]);
      return { users, partners, quests, rewards, analytics, pending };
    },
  });

  return (
    <DashboardLayout title="Admin" nav={ADMIN_NAV}>
      <h1 className="mb-6 font-poppins text-2xl font-bold text-foreground">
        Platform Overview
      </h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Users" value={data?.users.length ?? 0} />
        <MetricCard label="Partners" value={data?.partners.length ?? 0} />
        <MetricCard label="Quests" value={data?.quests.length ?? 0} />
        <MetricCard label="Rewards" value={data?.rewards.length ?? 0} />
        <MetricCard label="Total scans" value={data?.analytics.totalScans ?? 0} />
        <MetricCard label="Completions" value={data?.analytics.completions ?? 0} />
        <MetricCard label="Rewards redeemed" value={data?.analytics.rewardsRedeemed ?? 0} />
        <MetricCard
          label="Notes to review"
          value={data?.pending.length ?? 0}
          hint="moderation queue"
        />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <Link to="/admin/community-notes" className="glass-card block p-4 hover-lift">
          <p className="font-poppins font-semibold text-foreground">Moderation queue</p>
          <p className="text-sm text-muted-foreground">Review reported & pending notes.</p>
        </Link>
        <Link to="/admin/users" className="glass-card block p-4 hover-lift">
          <p className="font-poppins font-semibold text-foreground">Manage users</p>
          <p className="text-sm text-muted-foreground">Roles, status, points adjustments.</p>
        </Link>
        <Link to="/admin/analytics" className="glass-card block p-4 hover-lift">
          <p className="font-poppins font-semibold text-foreground">Analytics & audit</p>
          <p className="text-sm text-muted-foreground">Scans, ledger, audit logs.</p>
        </Link>
      </div>
    </DashboardLayout>
  );
}
