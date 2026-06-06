import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ADMIN_NAV } from "@/components/dashboard/navs";
import { SimpleTable } from "@/components/dashboard/SimpleTable";
import { Loading } from "@/components/app/ui";
import { Badge } from "@/components/ui/badge";
import { getRepository } from "@/lib/db";

export default function AdminRewards() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-rewards"],
    queryFn: async () => {
      const repo = await getRepository();
      const [rewards, partners] = await Promise.all([repo.listRewards(), repo.listPartners()]);
      const byId = Object.fromEntries(partners.map((p) => [p.id, p.name]));
      return rewards.map((r) => ({ ...r, partnerName: byId[r.partner_id] ?? r.partner_id }));
    },
  });

  return (
    <DashboardLayout title="Admin" nav={ADMIN_NAV}>
      <h1 className="mb-6 font-poppins text-2xl font-bold text-foreground">Rewards</h1>
      {isLoading ? (
        <Loading />
      ) : (
        <SimpleTable
          rows={data ?? []}
          keyOf={(r) => r.id}
          columns={[
            { header: "Title", cell: (r) => r.title },
            { header: "Partner", cell: (r) => <span className="text-muted-foreground">{r.partnerName}</span> },
            { header: "Cost", cell: (r) => `${r.points_cost} pts` },
            { header: "Inventory", cell: (r) => (r.inventory === null ? "∞" : r.inventory) },
            { header: "Status", cell: (r) => <Badge className="capitalize">{r.status}</Badge> },
          ]}
        />
      )}
    </DashboardLayout>
  );
}
