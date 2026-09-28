import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  KeyRound,
  MapPin,
  MessageSquare,
  Nfc,
  QrCode,
  Share2,
  Sparkle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useImpression } from "@/hooks/useImpression";
import { formatUnlockDate, type QuestActionDefinition, type RequiredActionType } from "@/lib/quests/questPage";
import { TopoLines } from "./QuestDecor";

/** What the CTA does right now; decided by the page from auth, scan and offer state. */
export type PrimaryCtaState = "available" | "signed_out" | "locked" | "busy" | "completed";

export interface CompletionSummary {
  xpAwarded: number | null;
  pointsAwarded: number | null;
  leveledUp: boolean;
  newLevel: number | null;
}

const ACTION_ICON: Record<RequiredActionType, typeof Camera> = {
  photo: Camera,
  check_in: MapPin,
  qr: QrCode,
  nfc: Nfc,
  staff_phrase: MessageSquare,
  venue_code: KeyRound,
  note: MessageSquare,
};

/**
 * The quest's required action: what to do, what it pays, and the one CTA that
 * starts the existing completion flow. Renders every state of that flow —
 * available, signed out, scan-to-unlock, saving and completed — so the card
 * never disappears from the layout.
 */
export function QuestPrimaryAction({
  action,
  ctaState,
  venueName,
  completion,
  nextAvailableAt,
  canShare,
  onCta,
  onShare,
  onViewed,
  onRewardViewed,
}: {
  action: QuestActionDefinition;
  ctaState: PrimaryCtaState;
  venueName: string | null;
  completion: CompletionSummary | null;
  /** Repeatable quests: when a new version unlocks. */
  nextAvailableAt: string | null;
  canShare: boolean;
  onCta: () => void;
  onShare: () => void;
  onViewed: () => void;
  onRewardViewed: () => void;
}) {
  const cardRef = useImpression<HTMLElement>(onViewed);
  const rewardRef = useImpression<HTMLDivElement>(onRewardViewed, { enabled: action.points != null });
  const Icon = ACTION_ICON[action.type as RequiredActionType] ?? CheckCircle2;
  const done = ctaState === "completed";

  return (
    <section ref={cardRef} aria-labelledby="quest-action-title" className="px-3 pt-6">
      <div
        className={cn(
          "relative overflow-hidden rounded-[1.75rem] border bg-gradient-to-b from-midnight-800/70 to-midnight-900/90 p-3 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)]",
          done ? "border-palm/50" : "border-white/10",
        )}
      >
        <div className="grid grid-cols-[minmax(76px,104px)_minmax(0,1fr)_58px] items-center gap-3">
          <ActionTile icon={Icon} image={action.image} />

          <div className="min-w-0 py-1">
            {done ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-palm/60 bg-palm/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(153_46%_62%)]">
                <CheckCircle2 className="h-3 w-3" aria-hidden /> Completed
              </span>
            ) : (
              <span className="inline-flex rounded-full border border-ocean/60 bg-ocean/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-ocean-soft">
                Your quest
              </span>
            )}
            <h2
              id="quest-action-title"
              className={cn(
                "mt-2 font-display font-bold leading-snug tracking-[-0.02em] text-sand-50",
                // Long generated/authored objectives step down so the card stays compact.
                action.title.length > 60 ? "text-[0.95rem]" : "text-[1.1rem] min-[400px]:text-[1.2rem]",
              )}
            >
              {action.title}
            </h2>
            {action.description && (
              <p className="mt-1.5 text-[13px] leading-snug text-sand-50/65">{action.description}</p>
            )}
          </div>

          {action.points != null ? (
            <div
              ref={rewardRef}
              className={cn(
                "flex flex-col items-center justify-center self-stretch rounded-2xl border px-1 py-3 text-center",
                done ? "border-palm/50 bg-palm/10" : "border-gold/70 bg-gold/[0.06]",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-midnight-950",
                  done ? "bg-[hsl(153_46%_52%)]" : "bg-gold shadow-[0_0_24px_-4px_hsl(var(--gold-500)/0.7)]",
                )}
              >
                {done ? <CheckCircle2 className="h-5 w-5" aria-hidden /> : <Sparkle className="h-5 w-5 fill-current" aria-hidden />}
              </span>
              <span className="mt-2 font-display text-xl font-extrabold leading-none text-gold">
                +{action.points}
              </span>
              <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-gold">Points</span>
              {action.xp != null && (
                <span className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-sand-50/55">
                  +{action.xp} XP
                </span>
              )}
            </div>
          ) : (
            <span aria-hidden />
          )}
        </div>
      </div>

      <div className="mt-4">
        {done ? (
          <CompletedPanel
            completion={completion}
            nextAvailableAt={nextAvailableAt}
            canShare={canShare}
            onShare={onShare}
          />
        ) : (
          <>
            <button
              type="button"
              onClick={onCta}
              disabled={ctaState === "busy"}
              className="group relative flex h-14 w-full items-center justify-center rounded-full bg-sand-50 px-14 text-[13px] font-bold uppercase tracking-[0.26em] text-midnight-950 shadow-[0_18px_40px_-20px_hsl(var(--sand-50)/0.6)] transition-[transform,background-color,box-shadow] duration-150 hover:bg-white hover:shadow-[0_18px_44px_-16px_hsl(var(--gold-500)/0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-midnight-950 active:scale-[0.98] disabled:opacity-70 motion-reduce:transition-none"
            >
              {CTA_LABEL[ctaState]}
              <span className="absolute right-6 flex items-center" aria-hidden>
                {ctaState === "locked" ? (
                  <QrCode className="h-5 w-5" />
                ) : (
                  <ArrowRight className="h-5 w-5 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                )}
              </span>
            </button>
            <p className="mt-2.5 px-4 text-center text-xs leading-relaxed text-sand-50/55">
              {ctaHint(ctaState, action, venueName)}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

const CTA_LABEL: Record<Exclude<PrimaryCtaState, "completed">, string> = {
  available: "Complete quest",
  signed_out: "Sign in to complete",
  locked: "Scan to unlock",
  busy: "Saving…",
};

function ctaHint(state: PrimaryCtaState, action: QuestActionDefinition, venueName: string | null): string {
  const at = venueName ? `at ${venueName}` : "at the venue";
  if (state === "locked") {
    return `Scan the SideQuests code or tap the NFC tag ${at} to unlock this quest.`;
  }
  if (action.verificationType === "gps") {
    return "Be at the venue to check in. Location is only used to verify — never stored.";
  }
  if (action.type === "photo") return `Complete it ${at}, then capture the moment.`;
  return `Complete the challenge ${at} to earn your reward.`;
}

function ActionTile({ icon: Icon, image }: { icon: typeof Camera; image: string | null }) {
  if (image) {
    return (
      <img src={image} alt="" loading="lazy" decoding="async" className="aspect-[0.92] h-full w-full rounded-2xl object-cover" />
    );
  }
  return (
    <div className="relative flex aspect-[0.92] w-full items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(110%_80%_at_30%_15%,hsl(var(--ocean-500)/0.45),transparent_60%),linear-gradient(160deg,hsl(var(--midnight-800)),hsl(var(--midnight-950)))]">
      <TopoLines className="absolute inset-0 h-full w-full text-sand-50/[0.12]" />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-sand-50/25 bg-midnight-950/50 text-sand-50 backdrop-blur-sm">
        <Icon className="h-7 w-7" strokeWidth={1.6} aria-hidden />
      </span>
    </div>
  );
}

function CompletedPanel({
  completion,
  nextAvailableAt,
  canShare,
  onShare,
}: {
  completion: CompletionSummary | null;
  nextAvailableAt: string | null;
  canShare: boolean;
  onShare: () => void;
}) {
  return (
    <div className="rounded-3xl border border-palm/30 bg-palm/[0.08] p-4 text-center">
      <p className="font-display text-lg font-bold text-sand-50">Quest complete!</p>
      {completion && (
        <p className="mt-1 text-sm text-sand-50/70">
          <span className="font-semibold text-gold">+{completion.pointsAwarded ?? 0} points</span>
          {" · "}+{completion.xpAwarded ?? 0} XP
          {completion.leveledUp && completion.newLevel != null && (
            <span className="font-semibold text-ocean-soft"> · Level {completion.newLevel}!</span>
          )}
        </p>
      )}
      {nextAvailableAt && (
        <p className="mt-1 text-sm text-sand-50/60">
          A new version unlocks on {formatUnlockDate(nextAvailableAt)}.
        </p>
      )}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {canShare && (
          <PanelButton onClick={onShare}>
            <Share2 className="h-4 w-4" aria-hidden /> Share
          </PanelButton>
        )}
        <PanelButton to="/app/map">More quests</PanelButton>
        <PanelButton to="/app/profile">View progress</PanelButton>
      </div>
    </div>
  );
}

function PanelButton({ children, to, onClick }: { children: ReactNode; to?: string; onClick?: () => void }) {
  const className =
    "inline-flex h-10 items-center gap-1.5 rounded-full border border-sand-50/20 px-4 text-sm font-semibold text-sand-50 transition-colors hover:border-gold/60 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";
  return to ? (
    <Link to={to} className={className}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}


export default QuestPrimaryAction;
