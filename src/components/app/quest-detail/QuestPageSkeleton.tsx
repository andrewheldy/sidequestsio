import { cn } from "@/lib/utils";

/**
 * Loading state that matches the quest page's real geometry (hero height,
 * title block overlap, action card, CTA, Explore & Share row, venue card), so
 * swapping in data causes no layout jump. Navy-on-navy with a soft shimmer;
 * static under prefers-reduced-motion (see `.sq-skeleton` in index.css).
 */
export function QuestPageSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading quest…</span>
      <div className="relative h-[clamp(300px,50svh,440px)] bg-midnight-900">
        <Bone className="absolute inset-0 rounded-none" />
        <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-midnight-950 to-transparent" />
        <div className="absolute inset-x-0 top-0 flex justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <Bone className="h-11 w-11 rounded-full" />
          <Bone className="h-11 w-28 rounded-full" />
        </div>
      </div>
      <div className="relative -mt-32 px-5">
        <Bone className="h-8 w-40 rounded-full" />
        <Bone className="mt-3 h-11 w-4/5 rounded-xl" />
        <Bone className="mt-2 h-8 w-1/2 rounded-xl" />
        <div className="mt-4 flex gap-4">
          <Bone className="h-5 w-32" />
          <Bone className="h-5 w-20" />
        </div>
      </div>
      <div className="flex gap-3 px-5 pt-5">
        <div className="flex-1 space-y-2">
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-11/12" />
          <Bone className="h-4 w-2/3" />
        </div>
        <Bone className="h-24 w-24 rounded-full max-[359px]:hidden" />
      </div>
      <div className="px-3 pt-6">
        <div className="grid grid-cols-[minmax(76px,104px)_minmax(0,1fr)_58px] gap-3 rounded-[1.75rem] border border-white/5 bg-midnight-900/80 p-3">
          <Bone className="aspect-[0.92] w-full rounded-2xl" />
          <div className="space-y-2 py-1">
            <Bone className="h-5 w-20 rounded-full" />
            <Bone className="h-5 w-full" />
            <Bone className="h-5 w-3/4" />
            <Bone className="h-3.5 w-full" />
          </div>
          <Bone className="h-full min-h-[110px] rounded-2xl" />
        </div>
        <Bone className="mt-4 h-14 w-full rounded-full" />
      </div>
      <div className="px-3 pt-8">
        <Bone className="ml-2 h-3 w-36" />
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Bone key={i} className="h-[118px] min-w-[64px] flex-1 rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="px-3 pt-8">
        <div className="flex gap-4 rounded-3xl border border-white/5 p-3">
          <Bone className="h-[104px] w-[104px] shrink-0 rounded-2xl" />
          <div className="flex-1 space-y-2 py-1">
            <Bone className="h-5 w-2/3" />
            <Bone className="h-3.5 w-full" />
            <Bone className="h-3.5 w-4/5" />
            <Bone className="mt-3 h-9 w-32 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Bone({ className }: { className?: string }) {
  return <div aria-hidden className={cn("sq-skeleton rounded-lg", className)} />;
}

export default QuestPageSkeleton;
