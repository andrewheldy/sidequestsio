/**
 * The reward the quester earns — XP and points, side by side. Rendered as a
 * bordered card that sits to the right of the quest title, echoing the mockup.
 */
export function RewardCard({ xp, points }: { xp: number; points: number }) {
  return (
    <div className="shrink-0 rounded-2xl border border-border/70 bg-card/40 px-4 py-3 text-center">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-primary">
        Reward
      </p>
      <div className="flex items-center gap-3">
        <div className="leading-none">
          <span className="font-poppins text-2xl font-bold text-primary">{xp}</span>{" "}
          <span className="font-poppins text-sm font-bold text-secondary">XP</span>
        </div>
        <span className="h-6 w-px bg-border/70" aria-hidden />
        <div className="leading-none">
          <span className="font-poppins text-2xl font-bold text-[hsl(140_65%_55%)]">
            {points}
          </span>{" "}
          <span className="font-poppins text-sm font-bold text-[hsl(140_55%_60%)]">
            PTS
          </span>
        </div>
      </div>
    </div>
  );
}

export default RewardCard;
