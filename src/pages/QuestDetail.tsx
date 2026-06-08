import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  Zap,
  Star,
  Trophy,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Globe,
  Instagram,
  Twitter,
  Facebook,
  UtensilsCrossed,
  CalendarDays,
  ShoppingBag,
  Truck,
  Gift,
  Phone,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Flame,
  Clock,
  Camera,
  MessageSquare,
  QrCode,
  Sparkles,
  Share2,
} from "lucide-react";
import { getRepository } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
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
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CommunityNotes } from "@/components/app/CommunityNotes";
import { QuestProofCamera } from "@/components/app/QuestProofCamera";
import { toast } from "sonner";
import type { CompleteQuestResult } from "@/lib/db/repository";
import type { QuestLinks, QuestWithContext, ProofMethod } from "@/types/db";

// ---------------------------------------------------------------------------
// Business link definitions (ordered by typical relevance)
// ---------------------------------------------------------------------------

const LINK_DEFS: Array<{
  key: keyof QuestLinks;
  label: string;
  icon: React.ElementType;
  type: string;
}> = [
  { key: "website_url",       label: "Website",         icon: Globe,         type: "website" },
  { key: "menu_url",          label: "Menu",             icon: UtensilsCrossed, type: "menu" },
  { key: "reservation_url",   label: "Reserve a Table",  icon: CalendarDays,  type: "reservation" },
  { key: "order_url",         label: "Order Online",     icon: ShoppingBag,   type: "order" },
  { key: "delivery_url",      label: "Delivery",         icon: Truck,         type: "delivery" },
  { key: "instagram_url",     label: "Instagram",        icon: Instagram,     type: "instagram" },
  { key: "tiktok_url",        label: "TikTok",           icon: ExternalLink,  type: "tiktok" },
  { key: "x_url",             label: "X / Twitter",      icon: Twitter,       type: "x" },
  { key: "facebook_url",      label: "Facebook",         icon: Facebook,      type: "facebook" },
];

// Separate from business links so it gets its own CTA section
const GOOGLE_REVIEW_KEY = "google_reviews_url" as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function difficultyColor(d: string | null | undefined) {
  if (d === "easy") return "bg-green-500/20 text-green-400 border-green-500/30";
  if (d === "hard") return "bg-red-500/20 text-red-400 border-red-500/30";
  return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
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
    const caption = encodeURIComponent(
      quest.social_share_prompt ?? `Just completed "${quest.title}"! 🗺️ #SideQuests`
    );
    if (platform === "x") {
      window.open(`https://x.com/intent/tweet?text=${caption}`, "_blank", "noopener");
    } else if (platform === "instagram") {
      navigator.clipboard.writeText(quest.social_share_prompt ?? `Just completed "${quest.title}"! 🗺️ #SideQuests`);
      toast.success("Caption copied — paste it into Instagram!");
    } else if (platform === "tiktok") {
      navigator.clipboard.writeText(quest.social_share_prompt ?? `Just completed "${quest.title}"! 🗺️ #SideQuests`);
      toast.success("Caption copied — paste it into TikTok!");
    }
  };

  // --- Derived display values ----------------------------------------------

  const venueLabel = quest.venue
    ? [quest.venue.name, quest.venue.city].filter(Boolean).join(" · ")
    : null;

  const businessName = quest.partner?.name ?? quest.venue?.name ?? null;

  const funkyAction =
    quest.funky_action ??
    quest.description ??
    (businessName ? `Complete this quest at ${businessName}.` : null);

  const proofMethod = quest.proof_method as ProofMethod | null | undefined;
  const ProofIcon = proofMethodIcon(proofMethod);

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative h-72 w-full overflow-hidden">
        {quest.image_url ? (
          <img
            src={quest.image_url}
            alt={quest.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 to-secondary/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 rounded-full bg-background/60 p-2 backdrop-blur"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>

        {/* Category badge */}
        <Badge className="absolute right-4 top-4 bg-primary capitalize text-primary-foreground">
          {quest.category.replace("_", " ")}
        </Badge>

        {/* Hero info */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          {/* Quest name */}
          <h1 className="font-poppins text-2xl font-bold leading-tight text-foreground">
            {quest.title}
          </h1>

          {/* Business name */}
          {businessName && (
            <p className="mt-0.5 text-sm font-medium text-primary">
              {businessName}
            </p>
          )}

          {/* Location / neighborhood */}
          {venueLabel && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{venueLabel}</span>
            </div>
          )}

          {/* Reward badges */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 rounded-lg bg-secondary/90 px-2.5 py-1 text-xs font-bold text-secondary-foreground backdrop-blur">
              <Zap className="h-3 w-3" /> +{quest.xp_reward} XP
            </span>
            <span className="flex items-center gap-1 rounded-lg bg-primary/90 px-2.5 py-1 text-xs font-bold text-primary-foreground backdrop-blur">
              <Star className="h-3 w-3" /> +{quest.points_reward} pts
            </span>
            {quest.links?.special_deals && (
              <span className="flex items-center gap-1 rounded-lg bg-amber-500/90 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
                <Gift className="h-3 w-3" /> Deal
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-md space-y-4 px-4 pt-4">

        {/* ── Main Quest Action Card ── */}
        {funkyAction && (
          <FunkyActionCard
            quest={quest}
            funkyAction={funkyAction}
            proofMethod={proofMethod}
          />
        )}

        {/* Special deal highlight */}
        {quest.links?.special_deals && (
          <div className="glass-card flex items-start gap-3 border border-amber-500/30 p-4">
            <Gift className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-foreground">Special Deal</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {quest.links.special_deals}
              </p>
            </div>
          </div>
        )}

        {/* Business / host links (excluding Google Reviews — shown separately) */}
        {quest.links && (
          <BusinessLinksSection links={quest.links} onLinkClick={handleLinkClick} />
        )}

        {/* Social placeholders */}
        {isDone && quest.social_share_prompt && (
          <SocialShareSection
            quest={quest}
            onShare={handleSocialShare}
          />
        )}

        {/* Google Review CTA */}
        {quest.links?.google_reviews_url && (
          <a
            href={quest.links.google_reviews_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleLinkClick("google_reviews")}
            className="glass-card flex items-center gap-3 border border-yellow-500/20 p-4 transition-colors hover:border-yellow-500/40 active:scale-[0.98]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-500/15">
              <Star className="h-4 w-4 text-yellow-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Leave a Google Review</p>
              <p className="text-xs text-muted-foreground">Help others discover this spot</p>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
          </a>
        )}

        {/* ── Completion CTA ── */}
        {isDone ? (
          <CompletedCard
            result={result}
            quest={quest}
            onShare={handleSocialShare}
          />
        ) : (
          <div className="glass-card space-y-3 p-5">
            <Button
              onClick={handleCompleteClick}
              disabled={busy}
              className="w-full gap-2"
              size="lg"
            >
              <CheckCircle2 className="h-5 w-5" />
              {isAuthenticated ? "Complete Quest" : "Sign in to complete"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {quest.verification_type === "gps"
                ? "Be at the venue to check in. Location is only used to verify — never stored."
                : "Complete the challenge at the venue to earn your reward."}
            </p>
          </div>
        )}

        {/* Breadcrumbs / Notes */}
        <CommunityNotes
          questId={quest.id}
          canPost={!!isDone && isAuthenticated}
          title="Breadcrumbs"
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

          {/* Funky action reminder */}
          {funkyAction && (
            <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
                Your Side Quest
              </p>
              <p className="text-sm leading-relaxed text-foreground">{funkyAction}</p>
            </div>
          )}

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

      {/* Quest Proof Camera — shown after successful completion */}
      {showProofCamera && result?.ok && quest && (
        <QuestProofCamera
          quest={quest}
          result={result}
          onDone={() => setShowProofCamera(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Funky Action Card — the hero mission element
// ---------------------------------------------------------------------------

function FunkyActionCard({
  quest,
  funkyAction,
  proofMethod,
}: {
  quest: QuestWithContext;
  funkyAction: string;
  proofMethod: ProofMethod | null | undefined;
}) {
  const ProofIcon = proofMethodIcon(proofMethod);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-5 shadow-sm">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />

      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-widest text-primary">
          Your Side Quest
        </span>
      </div>

      {/* Main action text */}
      <p className="text-base font-medium leading-relaxed text-foreground">
        {funkyAction}
      </p>

      {/* Meta badges */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {quest.difficulty && (
          <span
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${difficultyColor(quest.difficulty)}`}
          >
            <Flame className="h-3 w-3" />
            {quest.difficulty.charAt(0).toUpperCase() + quest.difficulty.slice(1)}
          </span>
        )}
        {quest.estimated_time && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <Clock className="h-3 w-3" />
            {quest.estimated_time}
          </span>
        )}
        {proofMethod && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <ProofIcon className="h-3 w-3" />
            {proofMethodLabel(proofMethod)}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Social share section
// ---------------------------------------------------------------------------

function SocialShareSection({
  quest,
  onShare,
}: {
  quest: QuestWithContext;
  onShare: (platform: string) => void;
}) {
  const caption = quest.social_share_prompt ?? `Just completed "${quest.title}"! 🗺️ #SideQuests`;

  return (
    <div className="glass-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Share2 className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Share your quest</p>
      </div>
      <p className="mb-3 rounded-lg bg-muted/50 px-3 py-2 text-xs italic text-muted-foreground">
        "{caption}"
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 text-xs"
          onClick={() => onShare("instagram")}
        >
          <Instagram className="h-3.5 w-3.5" />
          Instagram
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 text-xs"
          onClick={() => onShare("tiktok")}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          TikTok
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 text-xs"
          onClick={() => onShare("x")}
        >
          <Twitter className="h-3.5 w-3.5" />
          X
        </Button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Sharing is optional — your quest is complete either way.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Business links section
// ---------------------------------------------------------------------------

function BusinessLinksSection({
  links,
  onLinkClick,
}: {
  links: QuestLinks;
  onLinkClick: (type: string) => void;
}) {
  // Exclude Google Reviews — shown in its own CTA below
  const available = LINK_DEFS.filter(({ key }) => links[key]);
  const hasContact = !!links.contact_phone;

  if (available.length === 0 && !hasContact) return null;

  return (
    <div className="glass-card p-4">
      <p className="mb-3 text-sm font-semibold text-foreground">Links</p>
      <div className="grid grid-cols-2 gap-2">
        {available.map(({ key, label, icon: Icon, type }) => (
          <a
            key={key}
            href={links[key] as string}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onLinkClick(type)}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-sm font-medium text-foreground transition-colors active:scale-95 hover:bg-muted"
          >
            <Icon className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{label}</span>
          </a>
        ))}
        {hasContact && (
          <a
            href={`tel:${links.contact_phone}`}
            onClick={() => onLinkClick("contact")}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-sm font-medium text-foreground transition-colors active:scale-95 hover:bg-muted"
          >
            <Phone className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">Call</span>
          </a>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Completed card
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
          <Link to="/app/quests">More quests</Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/app/wallet">View wallet</Link>
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
