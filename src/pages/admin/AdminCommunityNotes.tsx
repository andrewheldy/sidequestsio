import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ADMIN_NAV } from "@/components/dashboard/navs";
import { Loading, EmptyState } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getRepository } from "@/lib/db";
import type { ModerationStatus } from "@/types/db";
import { toast } from "sonner";

const FILTERS: ModerationStatus[] = ["pending", "approved", "flagged", "rejected"];

export default function AdminCommunityNotes() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<ModerationStatus>("pending");

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["admin-notes", filter],
    queryFn: async () => (await getRepository()).listNotesForModeration(filter),
  });

  const moderate = async (id: string, status: ModerationStatus) => {
    const repo = await getRepository();
    await repo.setNoteModeration(id, status);
    qc.invalidateQueries({ queryKey: ["admin-notes"] });
    toast.success(`Note ${status}`);
  };

  return (
    <DashboardLayout title="Admin" nav={ADMIN_NAV}>
      <h1 className="mb-4 font-poppins text-2xl font-bold text-foreground">
        Community Notes
      </h1>

      <div className="mb-6 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Loading />
      ) : notes.length === 0 ? (
        <EmptyState title={`No ${filter} notes`} />
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div key={n.id} className="glass-card flex items-start gap-3 p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{n.author_display_name}</span>
                  <Badge className="capitalize">{n.moderation_status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{n.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" variant="outline" onClick={() => moderate(n.id, "approved")}>Approve</Button>
                <Button size="sm" variant="ghost" onClick={() => moderate(n.id, "rejected")}>Reject</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
