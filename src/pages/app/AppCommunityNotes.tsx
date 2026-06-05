import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { EmptyState, Loading } from "@/components/app/ui";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getRepository } from "@/lib/db";

/** A read-only feed of recent approved Community Notes across all quests. */
export default function AppCommunityNotes() {
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["all-notes"],
    queryFn: async () =>
      (await getRepository()).listNotesForModeration("approved"),
  });

  return (
    <AppLayout title="Community Notes" subtitle="Tips from fellow questers">
      {isLoading ? (
        <Loading />
      ) : notes.length === 0 ? (
        <EmptyState title="No notes yet" description="Complete a quest and leave the first tip." />
      ) : (
        <div className="mt-2 space-y-3">
          {notes.map((n) => (
            <Link key={n.id} to={`/quests/${n.quest_id}`} className="block">
              <div className="glass-card flex gap-3 p-4 hover-lift">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-muted text-xs">
                    {n.author_display_name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    {n.author_display_name}
                    <Sparkles className="h-3 w-3 text-secondary" />
                  </p>
                  <p className="text-sm text-muted-foreground">{n.content}</p>
                </div>
                {n.image_url && (
                  <img src={n.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
