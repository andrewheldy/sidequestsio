import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import DashboardLayout, { MetricCard } from "@/components/dashboard/DashboardLayout";
import { PARTNER_NAV } from "@/components/dashboard/navs";
import { Loading, EmptyState } from "@/components/app/ui";
import { usePartner } from "@/lib/partner/usePartner";
import { getRepository } from "@/lib/db";

export default function PartnerHome() {
  const { data: partner, isLoading } = usePartner();

  const { data: analytics } = useQuery({
    queryKey: ["partner-analytics", partner?.id],
    queryFn: async () => (await getRepository()).getPartnerAnalytics(partner!.id),
    enabled: !!partner,
  });

  return (
    <DashboardLayout title="Partner Portal" nav={PARTNER_NAV}>
      {isLoading ? (
        <Loading />
      ) : !partner ? (
        <EmptyState title="No partner account linked" description="Contact an admin to be linked to a partner organization." />
      ) : (
        <>
          <h1 className="font-poppins text-2xl font-bold text-foreground">{partner.name}</h1>
          <p className="text-sm capitalize text-muted-foreground">
            {partner.type} · {partner.status}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Total scans" value={analytics?.totalScans ?? 0} />
            <MetricCard label="Completions" value={analytics?.completions ?? 0} />
            <MetricCard
              label="Conversion"
              value={`${Math.round((analytics?.conversionRate ?? 0) * 100)}%`}
            />
            <MetricCard label="Rewards redeemed" value={analytics?.rewardsRedeemed ?? 0} />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <QuickLink to="/partner/quests" title="Manage quests" desc="Create and edit your quests." />
            <QuickLink to="/partner/analytics" title="View analytics" desc="Privacy-safe traffic insights." />
            <QuickLink to="/partner/qr-codes" title="QR codes" desc="Generate codes for venues." />
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

function QuickLink({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link to={to} className="glass-card block p-4 hover-lift">
      <p className="font-poppins font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}
