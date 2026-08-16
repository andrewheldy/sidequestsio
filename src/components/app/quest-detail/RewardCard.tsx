export function RewardCard({ xp, points }: { xp: number; points: number }) {
  return (
    <section aria-label="Quest rewards" className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="p-4">
        <p className="sq-overline text-[hsl(var(--ocean-700))]">Progress</p>
        <p className="sq-mono mt-2 text-xl font-bold text-[hsl(var(--ocean-700))]">+{xp} XP</p>
        <p className="mt-1 text-xs text-muted-foreground">Builds your level</p>
      </div>
      <div className="border-l border-border p-4">
        <p className="sq-overline text-[hsl(var(--gold-700))]">Spendable</p>
        <p className="sq-mono mt-2 text-xl font-bold text-[hsl(var(--gold-700))]">+{points} Points</p>
        <p className="mt-1 text-xs text-muted-foreground">Use on rewards</p>
      </div>
    </section>
  );
}

export default RewardCard;
