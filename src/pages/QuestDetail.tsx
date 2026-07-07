import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  Trophy,
  CheckCircle2,
  ArrowLeft,
  Instagram,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Camera,
  MessageSquare,
  QrCode,
  Share2,
  Twitter,
} from "lucide-react";
import { getRepository } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useSignInPrompt } from "@/contexts/SignInPromptContext";
import { recordQuestScan } from "@/lib/quests/scanFlow";
import { isDemoMode } from "@/lib/demo";
import { track } from "@/lib/analytics/events";
import {
  setPendingScan,
  getPendingScan,
  clearPendingScan,
} from "@/lib/app/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CommunityNotes } from "@/components/app/CommunityNotes";
import { QuestProofCamera } from "@/components/app/QuestProofCamera";
import BottomNav from "@/components/app/BottomNav";
import {
  QuestHero,
  RewardCard,
  QuestObjectiveCard,
  AboutActions,
  InfoCards,
} from "@/components/app/quest-detail";
import { toast } from "sonner";
import type { CompleteQuestResult } from "@/lib/db/repository";
import type { QuestLinks, QuestWithContext, ProofMethod } from "@/types/db";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Socials is a single landing page (Linktree/Linkme style), never a
 *  per-network button grid. Canonical key is `links.socials_url`; legacy
 *  per-platform keys are only a fallback for old demo content. */
function resolveSocialsUrl(links: QuestLinks | undefined): string | null {
  if (!links) return null;
  return (
    links.socials_url ||
    links.instagram_url ||
    links.tiktok_url ||
    links.x_url ||
    links.facebook_url ||
    null
  );
}

/** Human label for a $-sign price tier, shown as the card's secondary line. */
function priceRangeNote(priceRange: string | null | undefined): string | null {
  switch (priceRange) {
    case "$":    return "Budget-friendly";
    case "$$":   return "Moderate";
    case "$$$":  return "Upscale";
    case "$$$$": return "Luxury";
    default:     return null;
  }
}

function proofMethodLabel(method: ProofMethod | null | undefined): string {
  switch (method) {
    case "camera":
    case "photo":   return "Snap a photo as proof";
    case "staff_phrase": return "Show staff the phrase";
    case "breadcrumb":  return "Leave a Breadcrumb note";
    case "qr":      return "QR verified at venue";
    case "manual":  return "Mark complete yourself";
    default:        return "Complete at the venue";
  }
}

function proofMethodIcon(method: ProofMethod | null | undefined): React.ElementType {
  switch (method) {
    case "camera":
    case "photo":   return Camera;
    case "staff_phrase": return MessageSquare;
    case "breadcrumb":  return MessageSquare;
    case "qr":      return QrCode;
    default:        return CheckCircle2;
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function QuestDetail() {
  const { questId } = useParams<{ questId: string }>();
  const [params] = useSearchParams();
  const { user, isAuthenticated, refresh } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { promptSignIn } = useSignInPrompt();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const scanParam = params.get("scan");
  const [scanId, setScanId] = useState<string | null>(scanParam);
  const [venueCode, setVenueCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CompleteQuestResult | null>(null);
  const [showProofCamera, setShowProofCamera] = useState(false);
  const [showCompletionSheet, setShowCompletionSheet] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const recordedRef = useRef(false);
  const viewTrackedRef = useRef(false);
  const actionCardTrackedRef = useRef(false);

  const {
    data: quest,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["quest", questId],
    queryFn: async () => (await getRepository()).getQuest(questId!),
    enabled: !!questId,
    retry: 2,
    staleTime: 30_000,
  });

  const { data: completed } = useQuery({
    queryKey: ["completed", questId, user?.id],
    queryFn: async () =>
      user ? (await getRepository()).hasCompleted(user.id, questId!) : false,
    enabled: !!questId && !!user,
  });

  // Timeout guard: never show the spinner forever
  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const id = setTimeout(() => setTimedOut(true), 8_000);
    return () => clearTimeout(id);
  }, [isLoading]);

  // Track quest page view once per quest load
  useEffect(() => {
    if (!quest || viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    track("quest_page_viewed", {
      quest_id: quest.id,
      partner_id: quest.partner_id,
      venue_id: quest.venue_id,
      user_id: user?.id ?? null,
    });
    track("quest_page_view", {
      quest_id: quest.id,
      partner_id: quest.partner_id,
      user_id: user?.id ?? null,
    });
  }, [quest, user?.id]);

  // Track action card view once it's visible
  useEffect(() => {
    if (!quest || actionCardTrackedRef.current) return;
    if (!quest.funky_action && !quest.description) return;
    actionCardTrackedRef.current = true;
    track("action_card_view", {
      quest_id: quest.id,
      partner_id: quest.partner_id,
      user_id: user?.id ?? null,
    });
  }, [quest, user?.id]);

  // Organic visit: record a quest_viewed scan event once
  useEffect(() => {
    if (!questId || scanParam || recordedRef.current) return;
    recordedRef.current = true;
    (async () => {
      try {
        const res = await recordQuestScan(questId, user?.id ?? null);
        if (res.scan) setScanId(res.scan.id);
      } catch {
        // In demo mode scan recording is a no-op — silently ignore
      }
    })();
  }, [questId, scanParam, user]);

  // Resume a pending scan context after returning from auth
  useEffect(() => {
    if (!isAuthenticated) return;
    const pending = getPendingScan();
    if (pending && pending.questId === questId) {
      setScanId(pending.scanId);
      clearPendingScan();
    }
  }, [isAuthenticated, questId]);

  // --- Early returns -------------------------------------------------------
  if (isLoading && !timedOut) return <ShellWithLoader />;

  if (isError || timedOut || !quest) {
    return (
      <ShellWithError
        refetch={refetch}
        notFound={!isLoading && !isError && !timedOut && !quest}
      />
    );
  }

  const needsCode = quest.verification_type === "venue_code";
  const isDone = completed || result?.ok;

  // --- Event handlers ------------------------------------------------------

  const handleCompleteClick = () => {
    track("complete_quest_click", {
      quest_id: quest.id,
      partner_id: quest.partner_id,
      user_id: user?.id ?? null,
    });
    if (!isAuthenticated || !user) {
      if (scanId) setPendingScan({ questId: quest.id, scanId });
      navigate(
        `/auth?next=${encodeURIComponent(`/quests/${quest.id}?scan=${scanId ?? ""}`)}`,
      );
      return;
    }
    setShowCompletionSheet(true);
  };

  const handleComplete = async () => {
    if (isDemoMode) {
      toast.info("Demo mode — saving disabled for now.");
      return;
    }
    track("checkin_started", {
      quest_id: quest.id,
      partner_id: quest.partner_id,
      venue_id: quest.venue_id,
      user_id: user?.id ?? null,
    });
    track("proof_started", {
      quest_id: quest.id,
      user_id: user?.id ?? null,
      props: { proof_method: quest.proof_method ?? "manual" },
    });

    setBusy(true);
    const repo = await getRepository();
    await repo.startQuest(user!.id, quest.id);
    track("quest_started", { quest_id: quest.id, user_id: user!.id, partner_id: quest.partner_id });
    track("verification_started", { quest_id: quest.id, user_id: user!.id });

    const res = await repo.completeQuest({
      userId: user!.id,
      questId: quest.id,
      verificationMethod: quest.verification_type,
      venueCode: needsCode ? venueCode : undefined,
      sourceScanId: scanId,
    });
    setBusy(false);

    if (!res.ok) {
      track("verification_failed", {
        quest_id: quest.id,
        user_id: user!.id,
        props: { reason: res.error ?? "" },
      });
      const errorMessages: Record<string, string> = {
        already_completed: "You've already completed this quest.",
        verification_failed: needsCode
          ? "That venue code didn't match. Ask staff and try again."
          : "Verification failed. Please try again.",
        quest_inactive: "This quest isn't active right now.",
        quest_expired: "This quest has expired.",
        not_found: "Quest not found.",
      };
      toast.error(errorMessages[res.error ?? ""] ?? "Could not complete quest.");
      return;
    }

    track("verification_passed", { quest_id: quest.id, user_id: user!.id });
    track("quest_completed", { quest_id: quest.id, user_id: user!.id, partner_id: quest.partner_id });
    track("points_awarded", {
      quest_id: quest.id,
      user_id: user!.id,
      props: { points: res.pointsAwarded ?? 0, xp: res.xpAwarded ?? 0 },
    });
    track("proof_submitted", {
      quest_id: quest.id,
      user_id: user!.id,
      props: { proof_method: quest.proof_method ?? "manual" },
    });
    track("reward_viewed", {
      quest_id: quest.id,
      user_id: user!.id,
      props: { xp: res.xpAwarded ?? 0, points: res.pointsAwarded ?? 0 },
    });

    setResult(res);
    setShowCompletionSheet(false);
    await refresh();
    qc.invalidateQueries({ queryKey: ["completed", questId, user!.id] });
    toast.success(`+${res.xpAwarded} XP · +${res.pointsAwarded} points!`);
    setShowProofCamera(true);
  };

  const handleLinkClick = (type: string) => {
    track("link_clicked", {
      quest_id: quest.id,
      partner_id: quest.partner_id,
      venue_id: quest.venue_id,
      user_id: user?.id ?? null,
      link_type: type,
    });
    if (type === "google_reviews") {
      track("google_review_click", {
        quest_id: quest.id,
        partner_id: quest.partner_id,
        user_id: user?.id ?? null,
      });
    }
    if (type === "website") {
      track("website_click", {
        quest_id: quest.id,
        partner_id: quest.partner_id,
        user_id: user?.id ?? null,
      });
    }
  };

  const handleSocialShare = (platform: string) => {
    track("social_share_click", {
      quest_id: quest.id,
      partner_id: quest.partner_id,
      user_id: user?.id ?? null,
      props: { platform },
    });
    const caption = quest.social_share_prompt ?? `Just completed "${quest.title}"! 🗺️ #SideQuests`;
    if (platform === "x") {
      window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(caption)}`, "_blank", "noopener");
    } else if (platform === "instagram" || platform === "tiktok") {
      navigator.clipboard?.writeText(caption);
      toast.success(`Caption copied — paste it into ${platform === "instagram" ? "Instagram" : "TikTok"}!`);
    }
  };

  // Hero "Share" — shares the quest page itself.
  const handleShare = async () => {
    track("social_share_click", {
      quest_id: quest.id,
      partner_id: quest.partner_id,
      user_id: user?.id ?? null,
      props: { platform: "page" },
    });
    const url = window.location.href;
    const shareData = {
      title: quest.title,
      text: `Check out this SideQuest: ${quest.title}`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled or share failed — fall through to clipboard
    }
    try {
      await navigator.clipboard?.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      /* ignore */
    }
  };

  // Hero "Save" — favorites are gated behind sign-in per app rules.
  const handleToggleSave = () => {
    if (!isAuthenticated) {
      promptSignIn("save this quest");
      return;
    }
    toggleFavorite(quest.id);
  };

  // --- Derived display values ----------------------------------------------

  // The venue is the customer-facing business (partners are the B2B account
  // shell and may own several venue brands), so prefer the venue's name.
  const businessName = quest.venue?.name ?? quest.partner?.name ?? null;

  const venueLabel = quest.venue
    ? [quest.venue.name, quest.venue.city].filter(Boolean).join(" · ")
    : null;

  const objective =
    quest.funky_action ??
    quest.description ??
    (businessName ? `Complete this quest at ${businessName}.` : "Complete this quest at the venue.");

  const proofMethod = quest.proof_method as ProofMethod | null | undefined;
  const ProofIcon = proofMethodIcon(proofMethod);

  const websiteUrl = quest.links?.website_url ?? null;
  const reviewsUrl =
    quest.links?.reviews_url ?? quest.links?.google_reviews_url ?? null;
  const socialsUrl = resolveSocialsUrl(quest.links);

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
      <QuestHero
        imageUrl={quest.image_url}
        title={quest.title}
        businessName={businessName}
        logoUrl={quest.venue?.logo_url}
        category={quest.category}
        difficulty={quest.difficulty}
        estimatedTime={quest.estimated_time}
        isSaved={isFavorite(quest.id)}
        onBack={() => navigate(-1)}
        onShare={handleShare}
        onToggleSave={handleToggleSave}
      />

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-md space-y-5 px-4 pt-5">

        {/* ── 2. Quest summary ── */}
        <section>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="font-poppins text-3xl font-bold leading-tight text-foreground">
                {quest.title}
              </h1>
              {venueLabel && (
                <div className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground/80">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{venueLabel}</span>
                </div>
              )}
            </div>
            <RewardCard xp={quest.xp_reward} points={quest.points_reward} />
          </div>

          {quest.description && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {quest.description}
            </p>
          )}
        </section>

        {/* ── 3. Your SideQuest (objective) ── */}
        <QuestObjectiveCard objective={objective} />

        {/* ── 4. Primary CTA ── */}
        {isDone ? (
          <CompletedCard result={result} quest={quest} onShare={handleSocialShare} />
        ) : (
          <div className="space-y-2">
            <button
              onClick={handleCompleteClick}
              disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-primary to-[hsl(280_75%_60%)] py-4 font-poppins text-base font-bold uppercase tracking-wide text-white shadow-[0_10px_30px_-8px_hsl(6_89%_68%/0.6)] transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {isAuthenticated ? "Complete Quest" : "Sign in to complete"}
              <QrCode className="h-5 w-5" />
            </button>
            <p className="text-center text-xs text-muted-foreground">
              {quest.verification_type === "gps"
                ? "Be at the venue to check in. Location is only used to verify — never stored."
                : "Complete the challenge at the venue to earn your reward."}
            </p>
          </div>
        )}

        {/* ── 5. About (exactly three actions) ── */}
        <AboutActions
          businessName={businessName}
          websiteUrl={websiteUrl}
          reviewsUrl={reviewsUrl}
          socialsUrl={socialsUrl}
          onAction={handleLinkClick}
        />

        {/* ── 6. Information cards ── */}
        <InfoCards
          hours={quest.venue?.hours ?? null}
          hoursNote={quest.venue?.hours_note ?? null}
          priceRange={quest.venue?.price_range ?? null}
          priceNote={priceRangeNote(quest.venue?.price_range)}
          neighborhood={quest.venue?.neighborhood ?? quest.venue?.city ?? null}
          city={quest.venue?.neighborhood ? (quest.venue?.city ?? null) : null}
        />

        {/* ── 7. Community Notes ── */}
        <CommunityNotes
          questId={quest.id}
          canPost={!!isDone && isAuthenticated}
          title="Community Notes"
        />
      </div>

      {/* ── Completion Sheet ── */}
      <Sheet open={showCompletionSheet} onOpenChange={setShowCompletionSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="font-poppins text-lg">
              Ready to complete this quest?
            </SheetTitle>
          </SheetHeader>

          {/* Objective reminder */}
          <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
              Your Side Quest
            </p>
            <p className="text-sm leading-relaxed text-foreground">{objective}</p>
          </div>

          {/* Proof method instructions */}
          <div className="mb-4 flex items-start gap-3 rounded-xl bg-muted/50 p-3">
            <ProofIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {proofMethod === "staff_phrase" && quest.staff_phrase
                ? `Tell staff: "${quest.staff_phrase}"`
                : proofMethodLabel(proofMethod)}
            </p>
          </div>

          {/* Venue code input (when needed) */}
          {needsCode && (
            <div className="mb-4">
              <label className="text-sm text-muted-foreground">
                Enter the venue code from staff
              </label>
              <Input
                value={venueCode}
                onChange={(e) => setVenueCode(e.target.value)}
                placeholder="e.g. SUNRISE"
                className="mt-1 bg-muted/50 uppercase"
              />
            </div>
          )}

          <Button
            onClick={handleComplete}
            disabled={busy || (needsCode && !venueCode)}
            className="w-full gap-2"
            size="lg"
          >
            {busy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            {busy ? "Saving…" : "Confirm & Complete"}
          </Button>
        </SheetContent>
      </Sheet>

      {/* Quest Proof Camera — shown after successful completion (proof system) */}
      {showProofCamera && result?.ok && quest && (
        <QuestProofCamera
          quest={quest}
          result={result}
          onDone={() => setShowProofCamera(false)}
        />
      )}

      {/* ── Bottom navigation ── */}
      <BottomNav />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Completed card — replaces the primary CTA once the quest is done
// ---------------------------------------------------------------------------

function CompletedCard({
  result,
  quest,
  onShare,
}: {
  result: CompleteQuestResult | null;
  quest: QuestWithContext;
  onShare: (platform: string) => void;
}) {
  const [showShare, setShowShare] = useState(false);

  return (
    <div className="glass-card flex flex-col items-center gap-2 p-6 text-center glow-turquoise">
      <Trophy className="h-10 w-10 text-secondary" />
      <h2 className="font-poppins text-xl font-bold text-foreground">
        Quest complete!
      </h2>
      {result?.ok && (
        <p className="text-sm text-muted-foreground">
          +{result.xpAwarded} XP · +{result.pointsAwarded} points
          {result.leveledUp && (
            <span className="ml-1 font-semibold text-secondary">
              · Level up to {result.newLevel}! 🎉
            </span>
          )}
        </p>
      )}
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/app/explore">More quests</Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/app/profile">View progress</Link>
        </Button>
        {quest.social_share_prompt && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowShare((v) => !v)}
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
        )}
      </div>
      {showShare && quest.social_share_prompt && (
        <div className="mt-3 w-full">
          <p className="mb-2 rounded-lg bg-muted/50 px-3 py-2 text-xs italic text-muted-foreground">
            "{quest.social_share_prompt}"
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => onShare("instagram")}>
              <Instagram className="h-3.5 w-3.5" /> Instagram
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => onShare("tiktok")}>
              <ExternalLink className="h-3.5 w-3.5" /> TikTok
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => onShare("x")}>
              <Twitter className="h-3.5 w-3.5" /> X
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading / error shells
// ---------------------------------------------------------------------------

function ShellWithLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Loading quest…</p>
    </div>
  );
}

function ShellWithError({
  refetch,
  notFound,
}: {
  refetch: () => void;
  notFound?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <AlertCircle className="h-12 w-12 text-muted-foreground" />
      <div>
        <p className="font-poppins font-semibold text-foreground">
          {notFound ? "Quest not found" : "Couldn't load quest"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {notFound
            ? "This quest doesn't exist or has been removed."
            : "Check your connection and try again."}
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go back
        </Button>
        {!notFound && (
          <Button size="sm" onClick={() => void refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        )}
      </div>
    </div>
  );
}
