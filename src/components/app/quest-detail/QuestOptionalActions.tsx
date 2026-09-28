import { cn } from "@/lib/utils";
import { useImpression } from "@/hooks/useImpression";
import { OptionalActionIcon } from "@/components/brand/SocialIcons";
import type { OptionalActionType, QuestActionDefinition } from "@/lib/quests/questPage";

/**
 * "Explore & Share": the quest's optional actions as a row of cards. Each is
 * an outbound link today; the page tracks the click before the browser hands
 * off to the new tab. A click is never treated as a completion — points shown
 * here are what the quest advertises, not something this component awards.
 */
export function QuestOptionalActions({
  actions,
  onViewed,
  onClick,
}: {
  actions: QuestActionDefinition[];
  onViewed: (action: QuestActionDefinition, position: number) => void;
  onClick: (action: QuestActionDefinition, position: number) => void;
}) {
  if (actions.length === 0) return null;
  const advertisesPoints = actions.some((a) => a.points != null);

  return (
    <section aria-labelledby="explore-share-title" className="px-3 pt-8">
      <div className="flex items-end gap-3 px-2">
        <h2
          id="explore-share-title"
          className="shrink-0 text-[11px] font-bold uppercase tracking-[0.3em] text-sand-50/75"
        >
          Explore &amp; Share
        </h2>
        <span aria-hidden className="mb-1.5 h-px flex-1 bg-sand-50/15" />
        {advertisesPoints && (
          <span className="-rotate-3 font-display text-xs italic text-sand-50/50">More ways to earn</span>
        )}
      </div>

      <ul className="-mx-3 mt-4 flex snap-x gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {actions.map((action, i) => (
          <li key={action.id} className="min-w-[64px] flex-1 basis-0 snap-start">
            <QuestActionCard action={action} position={i} onViewed={onViewed} onClick={onClick} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function QuestActionCard({
  action,
  position,
  onViewed,
  onClick,
}: {
  action: QuestActionDefinition;
  position: number;
  onViewed: (action: QuestActionDefinition, position: number) => void;
  onClick: (action: QuestActionDefinition, position: number) => void;
}) {
  const ref = useImpression<HTMLAnchorElement>(() => onViewed(action, position));
  if (!action.url) return null;

  return (
    <a
      ref={ref}
      href={action.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onClick(action, position)}
      aria-label={`${action.label}${action.points != null ? `, ${action.points} points` : ""} (opens in a new tab)`}
      className={cn(
        "flex h-full min-h-[118px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-1.5 py-3 text-center",
        "transition-[transform,border-color,background-color] duration-150 hover:border-gold/40 hover:bg-white/[0.06] active:scale-[0.96]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold motion-reduce:transition-none",
      )}
    >
      <OptionalActionIcon type={action.type as OptionalActionType} className="h-8 w-8" />
      <span className="text-[12px] font-semibold leading-tight text-sand-50">{action.label}</span>
      {action.points != null && (
        <span className="text-[12px] font-semibold text-gold">+{action.points} pts</span>
      )}
    </a>
  );
}

export default QuestOptionalActions;
