import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ADMIN_NAV } from "@/components/dashboard/navs";
import { SimpleTable } from "@/components/dashboard/SimpleTable";
import { Loading } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getRepository } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/types/db";
import { toast } from "sonner";

export default function AdminUsers() {
  const { user: admin } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const repo = await getRepository();
      const users = await repo.listUsers();
      const profiles = await Promise.all(users.map((u) => repo.getProfile(u.id)));
      return users.map((u, i) => ({ user: u, profile: profiles[i] }));
    },
  });

  const adjust = async (u: User) => {
    const input = window.prompt(`Adjust points for ${u.display_name} (use negative to deduct):`, "100");
    if (input === null) return;
    const points = Number(input);
    if (Number.isNaN(points) || !admin) return;
    const repo = await getRepository();
    await repo.adjustPoints({ userId: u.id, points, reason: "Admin adjustment", actorId: admin.id });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success("Points adjusted");
  };

  const toggleStatus = async (u: User) => {
    const repo = await getRepository();
    const next = u.account_status === "active" ? "suspended" : "active";
    await repo.updateUser(u.id, { account_status: next });
    await repo.addAudit({ actorId: admin?.id ?? null, action: "user.status_changed", entityType: "user", entityId: u.id, metadata: { next } });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success(`User ${next}`);
  };

  return (
    <DashboardLayout title="Admin" nav={ADMIN_NAV}>
      <h1 className="mb-6 font-poppins text-2xl font-bold text-foreground">Users</h1>
      {isLoading ? (
        <Loading />
      ) : (
        <SimpleTable
          rows={data ?? []}
          keyOf={(r) => r.user.id}
          columns={[
            { header: "Name", cell: (r) => r.user.display_name },
            { header: "Email", cell: (r) => <span className="text-muted-foreground">{r.user.email}</span> },
            { header: "Role", cell: (r) => <Badge className="capitalize">{r.user.role}</Badge> },
            { header: "Level", cell: (r) => r.profile?.level ?? 1 },
            { header: "Points", cell: (r) => r.profile?.points_balance_cache ?? 0 },
            { header: "Status", cell: (r) => <span className="capitalize">{r.user.account_status}</span> },
            {
              header: "Actions",
              cell: (r) => (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => adjust(r.user)}>Points</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleStatus(r.user)}>
                    {r.user.account_status === "active" ? "Suspend" : "Activate"}
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}
    </DashboardLayout>
  );
}
