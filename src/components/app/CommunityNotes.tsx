import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageSquare, Send } from "lucide-react";
import { getRepository } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { track } from "@/lib/analytics/events";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionHeader } from "@/components/app/ui";
import { toast } from "sonner";

const MAX = 280;

/**
 * Quest-specific Community Notes (Phase 10). Notes are tips left by questers who
 * completed the quest — not a social feed. Only completers can post.
 */
export function CommunityNotes({
  questId,
  canPost,
}: {
  questId: string;
  canPost: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", questId],
    queryFn: async () => (await getRepository()).listNotesByQuest(questId),
  });

  const submit = async () => {
    if (!user || !content.trim()) return;
    setBusy(true);
    const repo = await getRepository();
    const res = await repo.createNote({ userId: user.id, questId, content });
    setBusy(false);
    if (!res.ok) {
      const map: Record<string, string> = {
        too_long: `Notes must be ${MAX} characters or fewer.`,
        not_completed: "Complete the quest before leaving a note.",
        empty: "Write something first.",
        not_found: "Quest not found.",
      };
      toast.error(map[res.error ?? ""] ?? "Could not post note.");
      return;
    }
    track("community_note_created", { quest_id: questId, user_id: user.id });
    setContent("");
    qc.invalidateQueries({ queryKey: ["notes", questId] });
    toast.success("Community Note posted!");
  };

  return (
    <section>
      <SectionHeader title="Community Notes" />

      {canPost && (
        <div className="glass-card mb-4 p-4">
          <Textarea
            value={content}
            maxLength={MAX}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Leave a tip for the next quester…"
            className="resize-none border-none bg-muted/40 focus-visible:ring-1"
            rows={3}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {content.length}/{MAX}
            </span>
            <Button size="sm" onClick={submit} disabled={busy || !content.trim()} className="gap-1">
              <Send className="h-4 w-4" /> Post
            </Button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="glass-card flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <MessageSquare className="h-4 w-4" /> No notes yet — be the first to share a tip.
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div key={n.id} className="glass-card flex gap-3 p-4">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-muted text-xs">
                  {n.author_display_name.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {n.author_display_name}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.content}</p>
              </div>
              {n.image_url && (
                <img
                  src={n.image_url}
                  alt=""
                  className="h-14 w-14 rounded-lg object-cover"
                />
              )}
              <span className="flex items-center gap-1 self-start text-xs text-muted-foreground">
                <Heart className="h-4 w-4 text-primary" />
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
