import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { PARTNER_NAV } from "@/components/dashboard/navs";
import AnalyticsView from "@/components/dashboard/AnalyticsView";
import { Loading, EmptyState } from "@/components/app/ui";
import { usePartner } from "@/lib/partner/usePartner";
import { getRepository } from "@/lib/db";

export default function PartnerAnalytics() {
  const { data: partner } = usePartner();

  const { data, isLoading } = useQuery({
    queryKey: ["partner-analytics-full", partner?.id],
    queryFn: async () => (await getRepository()).getPartnerAnalytics(partner!.id),
    enabled: !!partner,
  });

  return (
    <DashboardLayout title="Partner Portal" nav={PARTNER_NAV}>
      <h1 className="mb-2 font-poppins text-2xl font-bold text-foreground">Analytics</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Aggregate, privacy-safe metrics. No emails, no individual profiles, no precise locations.
      </p>
      {isLoading ? <Loading /> : !data ? <EmptyState title="No partner linked" /> : <AnalyticsView data={data} />}
    </DashboardLayout>
  );
}
