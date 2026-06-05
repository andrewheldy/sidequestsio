import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { EmptyState, Loading } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getRepository } from "@/lib/db";

export default function History() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["history", user?.id],
    queryFn: async () => {
      const repo = await getRepository();
      const completions = await repo.listCompletions(user!.id);
      const quests = await Promise.all(
        completions.map((c) => repo.getQuest(c.quest_id)),
      );
      return completions.map((c, i) => ({ completion: c, quest: quests[i] }));
    },
    enabled: !!user,
  });

  return (
    <AppLayout title="History">
      {isLoading ? (
        <Loading />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No completed quests yet"
          description="Your adventure log will appear here."
          action={
            <Button asChild className="mt-2">
              <Link to="/quests">Find a quest</Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-2 space-y-3">
          {data.map(({ completion, quest }) => (
            <div key={completion.id} className="glass-card flex items-center gap-3 p-3">
              <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-secondary" />
              <div className="flex-1">
                <p className="font-poppins font-semibold text-foreground">
                  {quest?.title ?? "Quest"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(completion.completed_at).toLocaleString()}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-secondary">+{completion.xp_awarded} XP</p>
                <p className="text-primary">+{completion.points_awarded} pts</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
