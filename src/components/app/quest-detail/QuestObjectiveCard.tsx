import { Crosshair, QrCode } from "lucide-react";

/**
 * "Your SideQuest" — the core gameplay card. Presents the real-world objective
 * the quester must complete, alongside a large scan glyph. This is the emotional
 * centre of the page, so it keeps a generous, focused footprint.
 */
export function QuestObjectiveCard({ objective }: { objective: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Quest Objective
            </span>
          </div>
          <p className="text-[15px] leading-relaxed text-foreground/90">{objective}</p>
        </div>

        <QrCode
          className="mt-1 h-16 w-16 shrink-0 text-primary/80"
          strokeWidth={1.5}
        />
      </div>
    </div>
  );
}

export default QuestObjectiveCard;
