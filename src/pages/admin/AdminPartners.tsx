import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ADMIN_NAV } from "@/components/dashboard/navs";
import { SimpleTable } from "@/components/dashboard/SimpleTable";
import { Loading } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getRepository } from "@/lib/db";
import type { Partner, PartnerStatus } from "@/types/db";
import { toast } from "sonner";

export default function AdminPartners() {
  const qc = useQueryClient();
  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => (await getRepository()).listPartners(),
  });

  const setStatus = async (p: Partner, status: PartnerStatus) => {
    const repo = await getRepository();
    await repo.upsertPartner({ id: p.id, name: p.name, status });
    qc.invalidateQueries({ queryKey: ["admin-partners"] });
    toast.success(`Partner ${status}`);
  };

  return (
    <DashboardLayout title="Admin" nav={ADMIN_NAV}>
      <h1 className="mb-6 font-poppins text-2xl font-bold text-foreground">Partners</h1>
      {isLoading ? (
        <Loading />
      ) : (
        <SimpleTable
          rows={partners}
          keyOf={(p) => p.id}
          columns={[
            { header: "Name", cell: (p) => p.name },
            { header: "Type", cell: (p) => <span className="capitalize">{p.type}</span> },
            { header: "Contact", cell: (p) => <span className="text-muted-foreground">{p.contact_email}</span> },
            { header: "Status", cell: (p) => <Badge className="capitalize">{p.status}</Badge> },
            {
              header: "Actions",
              cell: (p) => (
                <div className="flex gap-2">
                  {p.status !== "active" ? (
                    <Button size="sm" variant="outline" onClick={() => setStatus(p, "active")}>Approve</Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(p, "suspended")}>Suspend</Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}
    </DashboardLayout>
  );
}
