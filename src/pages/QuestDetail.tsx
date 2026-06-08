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
import { CommunityNotes } from "@/components/app/CommunityNotes";
import { QuestProofCamera } from "@/components/app/QuestProofCamera";
import { toast } from "sonner";
import type { CompleteQuestResult } from "@/lib/db/repository";
import type { QuestLinks } from "@/types/db";

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
  { key: "google_reviews_url",label: "Google Reviews",   icon: Star,          type: "google_reviews" },
  { key: "instagram_url",     label: "Instagram",        icon: Instagram,     type: "instagram" },
  { key: "tiktok_url",        label: "TikTok",           icon: ExternalLink,  type: "tiktok" },
  { key: "x_url",             label: "X / Twitter",      icon: Twitter,       type: "x" },
  { key: "facebook_url",      label: "Facebook",         icon: Facebook,      type: "facebook" },
];

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
  const [timedOut, setTimedOut] = useState(false);
  const recordedRef = useRef(false);
  const viewTrackedRef = useRef(false);

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

  // Track quest page view once per quest load (distinct from the QR scan event)
  useEffect(() => {
    if (!quest || viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    track("quest_page_viewed", {
      quest_id: quest.id,
      partner_id: quest.partner_id,
      venue_id: quest.venue_id,
      user_id: user?.id ?? null,
    });
  }, [quest, user?.id]);

  // Organic visit (no scan in URL): record a quest_viewed scan event once
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

  // --- Early returns for loading / error / not-found --------------------
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

  // --- Event handlers ---------------------------------------------------

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
    if (!isAuthenticated || !user) {
      if (scanId) setPendingScan({ questId: quest.id, scanId });
      navigate(
        `/auth?next=${encodeURIComponent(`/quests/${quest.id}?scan=${scanId ?? ""}`)}`,
      );
      return;
    }
    setBusy(true);
    const repo = await getRepository();
    await repo.startQuest(user.id, quest.id);
    track("quest_started", {
      quest_id: quest.id,
      user_id: user.id,
      partner_id: quest.partner_id,
    });
    track("verification_started", { quest_id: quest.id, user_id: user.id });

    const res = await repo.completeQuest({
      userId: user.id,
      questId: quest.id,
      verificationMethod: quest.verification_type,
      venueCode: needsCode ? venueCode : undefined,
      sourceScanId: scanId,
    });
    setBusy(false);

    if (!res.ok) {
      track("verification_failed", {
        quest_id: quest.id,
        user_id: user.id,
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

    track("verification_passed", { quest_id: quest.id, user_id: user.id });
    track("quest_completed", {
      quest_id: quest.id,
      user_id: user.id,
      partner_id: quest.partner_id,
    });
    track("points_awarded", {
      quest_id: quest.id,
      user_id: user.id,
      props: { points: res.pointsAwarded ?? 0, xp: res.xpAwarded ?? 0 },
    });
    setResult(res);
    await refresh();
    qc.invalidateQueries({ queryKey: ["completed", questId, user.id] });
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
  };

  // --- Render -----------------------------------------------------------

  const venueLabel = quest.venue
    ? [quest.venue.name, quest.venue.city].filter(Boolean).join(" · ")
    : null;

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
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

        {/* Hero info — overlaid at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <h1 className="font-poppins text-2xl font-bold leading-tight text-foreground">
            {quest.title}
          </h1>

          {venueLabel && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{venueLabel}</span>
            </div>
          )}

          {/* Quest objective (first line of description) */}
          <p className="mt-1.5 line-clamp-2 text-xs italic text-muted-foreground">
            {quest.description}
          </p>

          {/* Reward pills */}
          <div className="mt-2 flex items-center gap-2">
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

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-md space-y-4 px-4 pt-4">
        {/* Quest description + meta */}
        <div className="glass-card p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {quest.description}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span className="capitalize">
              {quest.verification_type.replace("_", " ")} verification
            </span>
            <span>·</span>
            <span className="capitalize">{quest.difficulty}</span>
          </div>
        </div>

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

        {/* Business / host links */}
        {quest.links && (
          <BusinessLinksSection links={quest.links} onLinkClick={handleLinkClick} />
        )}

        {/* Completion CTA */}
        {isDone ? (
          <CompletedCard result={result} />
        ) : (
          <div className="glass-card space-y-3 p-5">
            {needsCode && (
              <div>
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
              <CheckCircle2 className="h-5 w-5" />
              {isAuthenticated ? "Complete quest" : "Sign in to complete"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {quest.verification_type === "gps"
                ? "Be at the venue to check in. Location is only used to verify — never stored."
                : "Complete the challenge at the venue to earn your reward."}
            </p>
          </div>
        )}

        {/* Breadcrumbs / Notes — always shown on quest pages */}
        <CommunityNotes
          questId={quest.id}
          canPost={!!isDone && isAuthenticated}
          title="Breadcrumbs"
        />
      </div>

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
// Business links section
// ---------------------------------------------------------------------------

function BusinessLinksSection({
  links,
  onLinkClick,
}: {
  links: QuestLinks;
  onLinkClick: (type: string) => void;
}) {
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
            className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-sm font-medium text-foreground transition-colors active:scale-95 hover:bg-muted"
          >
            <Icon className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{label}</span>
          </a>
        ))}
        {hasContact && (
          <a
            href={`tel:${links.contact_phone}`}
            onClick={() => onLinkClick("contact")}
            className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-sm font-medium text-foreground transition-colors active:scale-95 hover:bg-muted"
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

function CompletedCard({ result }: { result: CompleteQuestResult | null }) {
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
      <div className="mt-2 flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/app/quests">More quests</Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/app/wallet">View wallet</Link>
        </Button>
      </div>
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
