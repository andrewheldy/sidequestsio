import { Crosshair } from 'lucide-react';

export function QuestObjectiveCard({ objective }: { objective: string }) {
  return (
    <section className="rounded-2xl border border-[hsl(var(--midnight-900)/0.12)] bg-[hsl(var(--sand-200))] p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="sq-overline text-[hsl(var(--ocean-700))]">Your quest</p>
        <Crosshair className="h-5 w-5 text-[hsl(var(--ocean-700))]" aria-hidden />
      </div>
      <p className="font-display text-xl font-bold leading-snug tracking-[-0.025em] text-foreground">{objective}</p>
    </section>
  );
}

export default QuestObjectiveCard;
