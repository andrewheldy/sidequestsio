import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ADMIN_NAV } from "@/components/dashboard/navs";
import { SimpleTable } from "@/components/dashboard/SimpleTable";
import { Loading } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getRepository } from "@/lib/db";
import type { EntityStatus, QuestWithContext } from "@/types/db";
import { toast } from "sonner";

export default function AdminQuests() {
  const qc = useQueryClient();
  const { data: quests = [], isLoading } = useQuery({
    queryKey: ["admin-quests"],
    queryFn: async () => (await getRepository()).listQuests(),
  });

  const setStatus = async (q: QuestWithContext, status: EntityStatus) => {
    const repo = await getRepository();
    await repo.upsertQuest({ id: q.id, partner_id: q.partner_id, title: q.title, status });
    qc.invalidateQueries({ queryKey: ["admin-quests"] });
    toast.success(`Quest ${status}`);
  };

  return (
    <DashboardLayout title="Admin" nav={ADMIN_NAV}>
      <h1 className="mb-6 font-poppins text-2xl font-bold text-foreground">Quests</h1>
      {isLoading ? (
        <Loading />
      ) : (
        <SimpleTable
          rows={quests}
          keyOf={(q) => q.id}
          columns={[
            { header: "Title", cell: (q) => q.title },
            { header: "Partner", cell: (q) => <span className="text-muted-foreground">{q.partner?.name}</span> },
            { header: "Category", cell: (q) => <span className="capitalize">{q.category.replace("_", " ")}</span> },
            { header: "Rewards", cell: (q) => `${q.xp_reward} XP / ${q.points_reward} pts` },
            { header: "Status", cell: (q) => <Badge className="capitalize">{q.status}</Badge> },
            {
              header: "Actions",
              cell: (q) => (
                <div className="flex gap-2">
                  {q.status !== "active" ? (
                    <Button size="sm" variant="outline" onClick={() => setStatus(q, "active")}>Activate</Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(q, "paused")}>Pause</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setStatus(q, "archived")}>Archive</Button>
                </div>
              ),
            },
          ]}
        />
      )}
    </DashboardLayout>
  );
}
