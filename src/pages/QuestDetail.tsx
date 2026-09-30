import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  MessageSquare,
  QrCode,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { getRepository } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useSignInPrompt } from "@/contexts/SignInPromptContext";
import { recordQuestScan } from "@/lib/quests/scanFlow";
import { isDemoMode } from "@/lib/demo";
import { nanoid } from "@/lib/app/id";
import { setPendingScan, getPendingScan, clearPendingScan } from "@/lib/app/session";
import {
  applyInstance,
  buildQuestPageModel,
  formatUnlockDate,
  hostOf,
  type QuestActionDefinition,
} from "@/lib/quests/questPage";
import {
  questEventContext,
  trackQuestEvent,
  trackQuestEventOnce,
  type QuestEventContext,
} from "@/lib/analytics/questEvents";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CommunityNotes } from "@/components/app/CommunityNotes";
import BottomNav from "@/components/app/BottomNav";
import { NoQuestFound } from "@/components/app/NoQuestFound";
import {
  QuestHero,
  QuestIntro,
  QuestOptionalActions,
  QuestPageSkeleton,
  QuestPrimaryAction,
  VenueInfoCard,
  type PrimaryCtaState,
} from "@/components/app/quest-detail";
import type { CompleteQuestResult } from "@/lib/db/repository";
import type { ProofMethod, QuestInstance } from "@/types/db";

// The capture flow only opens after a completion — keep its camera/canvas code
// out of the quest page's initial download.
const QuestProofCamera = lazy(() =>
  import("@/components/app/QuestProofCamera").then((m) => ({ default: m.QuestProofCamera })),
);

const COMPLETE_ERRORS: Record<string, string> = {
  already_completed: "You've already completed this quest.",
  instance_invalid: "This quest refreshed. Reload the page to get your current objective.",
  scan_required: "Scan the QR code or tap the NFC tag at the venue, then try again.",
  quest_inactive: "This quest isn't active right now.",
  quest_expired: "This quest has expired.",
  not_found: "Quest not found.",
};

/**
 * /quests/:questId — the one quest page template. Every quest renders through
 * it: data comes from the repository (Supabase in production), is adapted by
 * buildQuestPageModel, and flows into presentational sections. Completion uses
 * the existing server-verified flow (startQuest → completeQuest RPC → capture).
 */
export default function QuestDetail() {
  const { questId } = useParams<{ questId: string }>();
  const [params] = useSearchParams();
  const location = useLocation();
  const { user, isAuthenticated, refresh } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { promptSignIn } = useSignInPrompt();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const scanParam = params.get("scan");
  const [scanId, setScanId] = useState<string | null>(scanParam);
  // True when scanId came from a real venue code (/scan/<code>, QR or NFC),
  // which QR/NFC quests need to complete. The server makes the final call.
  const via = params.get("via");
  const [scanVerified, setScanVerified] = useState(
    !!scanParam && (via === "qr" || via === "nfc" || via === "scan"),
  );
  const [venueCode, setVenueCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CompleteQuestResult | null>(null);
  const [showProofCamera, setShowProofCamera] = useState(false);
  const [showCompletionSheet, setShowCompletionSheet] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const recordedRef = useRef(false);

  // One page view per quest id: groups this visit's events and scopes de-duping.
  // questId is the intended cache key here, not an input.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pageViewId = useMemo(() => nanoid(12), [questId]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadStartedAt = useMemo(() => performance.now(), [questId]);
  // Attribution is fixed at entry; later query-string changes don't rewrite it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const arrival = useMemo(() => arrivalContext(params, location.state), [pageViewId]);

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

  // What this user can do here, including the objective generated for this
  // visit (stable until completed or expired; see 0017_quest_frameworks.sql).
  const { data: offer } = useQuery({
    queryKey: ["quest-offer", questId, user?.id],
    queryFn: async () => (await getRepository()).getQuestOffer(user!.id, questId!),
    enabled: !!questId && !!user,
    staleTime: 60_000,
  });
  // Keeps the completed objective on screen after the offer refetches.
  const [completedInstance, setCompletedInstance] = useState<QuestInstance | null>(null);
  const instance = offer?.instance ?? completedInstance;

  // The quest as this user sees it: a generated objective, instructions and
  // rewards replace the static ones when there is an instance.
  const shown = useMemo(
    () => (quest ? (instance ? applyInstance(quest, instance) : quest) : null),
    [quest, instance],
  );
  const model = useMemo(() => (shown ? buildQuestPageModel(shown) : null), [shown]);

  const ctx: QuestEventContext = questEventContext(model, {
    questId: questId ?? "",
    userId: user?.id ?? null,
    pageViewId,
    source: arrival.source,
    utm: arrival.utm,
  });
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  // Timeout guard: never show the skeleton forever.
  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const id = setTimeout(() => setTimedOut(true), 8_000);
    return () => clearTimeout(id);
  }, [isLoading]);

  // --- Page-level analytics (each at most once per page view) --------------
  useEffect(() => {
    trackQuestEventOnce("page", "quest_page_viewed", ctxRef.current, {
      props: arrival.referrerDomain ? { referrer_domain: arrival.referrerDomain } : undefined,
    });
  }, [pageViewId, arrival.referrerDomain]);

  useEffect(() => {
    if (!model) return;
    trackQuestEventOnce("page", "quest_page_loaded", ctxRef.current, {
      props: {
        load_ms: Math.round(performance.now() - loadStartedAt),
        has_hero_image: !!model.hero.imageUrl,
        optional_action_count: model.optionalActions.length,
        has_generated_objective: !!instance,
      },
    });
  }, [model, loadStartedAt, instance]);

  const failure = isError ? "error" : timedOut ? "timeout" : !isLoading && !quest ? "not_found" : null;
  useEffect(() => {
    if (!failure || !questId) return;
    trackQuestEventOnce("page", "quest_load_failed", ctxRef.current, { props: { reason: failure } });
  }, [failure, questId]);

  // Organic visit: record a quest_viewed scan event once.
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

  // Resume a pending scan context after returning from auth.
  useEffect(() => {
    if (!isAuthenticated) return;
    const pending = getPendingScan();
    if (pending && pending.questId === questId) {
      setScanId(pending.scanId);
      setScanVerified(!!pending.verified);
      clearPendingScan();
    }
  }, [isAuthenticated, questId]);

  // --- Loading / error ---------------------------------------------------
  if (isLoading && !timedOut) {
    return (
      <QuestPageShell>
        <QuestPageSkeleton />
      </QuestPageShell>
    );
  }

  if (failure || !quest || !shown || !model) {
    return (
      <QuestPageShell>
        {failure === "not_found" ? (
          <NoQuestFound className="min-h-[80vh] justify-center py-10" />
        ) : (
          <QuestLoadError onRetry={() => void refetch()} />
        )}
      </QuestPageShell>
    );
  }

  // --- Derived state -------------------------------------------------------
  const primary = model.requiredActions[0];
  const needsCode = quest.verification_type === "venue_code";
  // QR/NFC quests unlock only from a scan of the venue's code (0018).
  const needsScan = quest.verification_type === "qr" || quest.verification_type === "nfc";
  const isDone = (offer && offer.status !== "available") || !!result?.ok;
  const ctaState: PrimaryCtaState = isDone
    ? "completed"
    : busy
      ? "busy"
      : needsScan && !scanVerified
        ? "locked"
        : isAuthenticated
          ? "available"
          : "signed_out";
  const venueName = model.venue?.name ?? quest.partner?.name ?? null;
  const proofMethod = shown.proof_method as ProofMethod | null | undefined;
  const ProofIcon = proofMethodIcon(proofMethod);

  // --- Handlers ------------------------------------------------------------

  const handleBack = () => {
    trackQuestEvent("quest_back_clicked", ctx, { trackingId: "nav.back" });
    // Arriving straight from a QR code there is no in-app page to go back to.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate("/app/map");
  };

  const handleCta = () => {
    trackQuestEvent("quest_primary_action_clicked", ctx, {
      action: primary,
      position: 0,
      props: { cta_state: ctaState },
    });
    if (ctaState === "locked") {
      navigate("/app/checkin");
      return;
    }
    if (ctaState === "signed_out" || !user) {
      if (scanId) setPendingScan({ questId: quest.id, scanId, verified: scanVerified });
      const viaParam = scanVerified ? "&via=scan" : "";
      navigate(
        `/auth?next=${encodeURIComponent(`/quests/${quest.id}?scan=${scanId ?? ""}${viaParam}`)}`,
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
    if (!user) return;
    const detail = { action: primary, position: 0 };
    trackQuestEvent("quest_primary_action_started", ctx, {
      ...detail,
      props: { proof_method: proofMethod ?? "manual" },
    });

    setBusy(true);
    try {
      const repo = await getRepository();
      await repo.startQuest(user.id, quest.id);
      const res = await repo.completeQuest({
        userId: user.id,
        questId: quest.id,
        verificationMethod: quest.verification_type,
        venueCode: needsCode ? venueCode : undefined,
        sourceScanId: scanId,
        instanceId: instance?.id ?? null,
      });

      if (!res.ok) {
        trackQuestEvent("quest_primary_action_failed", ctx, {
          ...detail,
          props: { reason: res.error ?? "unknown" },
        });
        const message =
          res.error === "cooldown"
            ? `You can do a new version of this quest on ${formatUnlockDate(res.availableAt)}.`
            : res.error === "verification_failed"
              ? needsCode
                ? "That venue code didn't match. Ask staff and try again."
                : "Verification failed. Please try again."
              : COMPLETE_ERRORS[res.error ?? ""] ?? "Could not complete quest.";
        toast.error(message);
        if (res.error === "scan_required") {
          setScanVerified(false);
          setShowCompletionSheet(false);
        }
        return;
      }

      const awarded = {
        points_awarded: res.pointsAwarded ?? 0,
        xp_awarded: res.xpAwarded ?? 0,
      };
      trackQuestEvent("quest_primary_action_completed", ctx, {
        ...detail,
        props: { ...awarded, leveled_up: !!res.leveledUp },
      });
      trackQuestEvent("reward_earned", ctx, { ...detail, props: awarded });

      setResult(res);
      setCompletedInstance(instance);
      setShowCompletionSheet(false);
      await refresh();
      qc.invalidateQueries({ queryKey: ["quest-offer", questId, user.id] });
      qc.invalidateQueries({ queryKey: ["completions", user.id] });
      toast.success(`+${res.xpAwarded} XP · +${res.pointsAwarded} points!`);
      // Photo quests (and every quest) continue into the existing capture flow.
      setShowProofCamera(true);
    } catch {
      trackQuestEvent("quest_action_failed", ctx, { ...detail, props: { stage: "complete" } });
      toast.error("Couldn't reach SideQuests. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const shareOrCopy = async (data: ShareData, copied: string) => {
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
    } catch {
      return; // cancelled — nothing to do
    }
    try {
      await navigator.clipboard?.writeText(data.text ? `${data.text} ${data.url ?? ""}`.trim() : data.url ?? "");
      toast.success(copied);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleShare = () => {
    trackQuestEvent("quest_share_clicked", ctx, { trackingId: "quest.share", props: { target: "page" } });
    void shareOrCopy(
      { title: quest.title, text: `Check out this SideQuest: ${quest.title}`, url: window.location.href },
      "Link copied to clipboard",
    );
  };

  const handleShareWin = () => {
    trackQuestEvent("quest_share_clicked", ctx, {
      trackingId: "quest.completed.share",
      props: { target: "completion" },
    });
    const caption = shown.social_share_prompt ?? `Just completed "${quest.title}" on SideQuests 🗺️ #sidequests`;
    void shareOrCopy({ text: caption, url: `${window.location.origin}/quests/${quest.id}` }, "Caption copied — paste it anywhere!");
  };

  // Favorites are gated behind sign-in per app rules.
  const handleToggleSave = () => {
    trackQuestEvent("quest_save_toggled", ctx, {
      trackingId: "quest.save",
      props: { saved: !isFavorite(quest.id), signed_in: isAuthenticated },
    });
    if (!isAuthenticated) {
      promptSignIn("save this quest");
      return;
    }
    toggleFavorite(quest.id);
  };

  const handleOptionalViewed = (action: QuestActionDefinition, position: number) =>
    trackQuestEventOnce(action.id, "quest_optional_action_viewed", ctx, { action, position });

  // Fires synchronously in the click handler, before the new tab opens; the
  // link itself does the navigation, so analytics can never block it.
  const handleOptionalClick = (action: QuestActionDefinition, position: number) =>
    trackQuestEvent("quest_optional_action_clicked", ctx, { action, position });

  return (
    <QuestPageShell>
      <QuestHero
        hero={model.hero}
        category={model.category}
        categoryLabel={model.categoryLabel}
        isSaved={isFavorite(quest.id)}
        onBack={handleBack}
        onShare={handleShare}
        onToggleSave={handleToggleSave}
        onVisible={(image) =>
          trackQuestEventOnce("hero", "quest_hero_viewed", ctxRef.current, { props: { hero_image: image } })
        }
      />

      <QuestIntro text={model.intro} />

      <QuestPrimaryAction
        action={primary}
        ctaState={ctaState}
        venueName={venueName}
        completion={
          result?.ok
            ? {
                xpAwarded: result.xpAwarded ?? null,
                pointsAwarded: result.pointsAwarded ?? null,
                leveledUp: !!result.leveledUp,
                newLevel: result.newLevel ?? null,
              }
            : null
        }
        nextAvailableAt={offer?.status === "cooldown" ? offer.availableAt ?? null : null}
        canShare
        onCta={handleCta}
        onShare={handleShareWin}
        onViewed={() =>
          trackQuestEventOnce(primary.id, "quest_primary_action_viewed", ctxRef.current, {
            action: primary,
            position: 0,
            props: { cta_state: ctaState },
          })
        }
        onRewardViewed={() =>
          trackQuestEventOnce(primary.id, "reward_impression", ctxRef.current, { action: primary, position: 0 })
        }
      />

      <QuestOptionalActions
        actions={model.optionalActions}
        onViewed={handleOptionalViewed}
        onClick={handleOptionalClick}
      />

      {model.venue && (
        <VenueInfoCard
          venue={model.venue}
          onViewed={() => trackQuestEventOnce("venue", "venue_card_viewed", ctxRef.current)}
          onWebsiteClick={() =>
            trackQuestEvent("venue_website_clicked", ctx, {
              trackingId: "venue.website",
              props: { destination_domain: hostOf(model.venue?.websiteUrl) },
            })
          }
        />
      )}

      <div className="px-5 pt-8">
        <CommunityNotes questId={quest.id} canPost={!!isDone && isAuthenticated} title="Community Notes" />
      </div>

      {/* Completion confirmation — the existing, server-verified flow. */}
      <Sheet open={showCompletionSheet} onOpenChange={setShowCompletionSheet}>
        <SheetContent
          side="bottom"
          className="dark mx-auto max-w-xl rounded-t-[2rem] border-white/10 bg-midnight-950 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] text-sand-50"
        >
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="font-display text-xl text-sand-50">Ready to complete this quest?</SheetTitle>
          </SheetHeader>

          <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-ocean-soft">Your quest</p>
            <p className="text-sm leading-relaxed text-sand-50">{primary.title}</p>
          </div>

          <div className="mb-4 flex items-start gap-3 rounded-xl bg-white/[0.04] p-3">
            <ProofIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
            <p className="text-sm text-sand-50/75">
              {proofMethod === "staff_phrase" && shown.staff_phrase
                ? `Tell staff: "${shown.staff_phrase}"`
                : proofMethodLabel(proofMethod)}
            </p>
          </div>

          {needsCode && (
            <div className="mb-4">
              <label htmlFor="venue-code" className="text-sm text-sand-50/70">
                Enter the venue code from staff
              </label>
              <Input
                id="venue-code"
                value={venueCode}
                onChange={(e) => setVenueCode(e.target.value)}
                placeholder="e.g. SUNRISE"
                autoComplete="off"
                className="mt-1 border-white/15 bg-white/[0.04] uppercase text-sand-50"
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleComplete}
            disabled={busy || (needsCode && !venueCode)}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-sand-50 text-[13px] font-bold uppercase tracking-[0.22em] text-midnight-950 transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            <CheckCircle2 className="h-5 w-5" aria-hidden />
            {busy ? "Saving…" : "Confirm & complete"}
          </button>
        </SheetContent>
      </Sheet>

      {showProofCamera && result?.ok && (
        <Suspense fallback={null}>
          <QuestProofCamera quest={shown} result={result} onDone={() => setShowProofCamera(false)} />
        </Suspense>
      )}
    </QuestPageShell>
  );
}

// ---------------------------------------------------------------------------
// Shell, error state and helpers
// ---------------------------------------------------------------------------

/**
 * Dark, phone-width column. `dark` switches the shadcn tokens for anything
 * nested (Community Notes). On wide screens the column stays at app width on
 * a navy stage instead of stretching.
 */
function QuestPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen bg-midnight-950 bg-[radial-gradient(60rem_40rem_at_50%_-10%,hsl(var(--ocean-500)/0.10),transparent_70%)] text-sand-50">
      <main className="relative mx-auto w-full max-w-xl overflow-x-clip bg-midnight-950 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:min-h-screen sm:border-x sm:border-white/5 sm:shadow-[0_0_80px_-20px_rgba(0,0,0,0.8)]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

function QuestLoadError({ onRetry }: { onRetry: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertCircle className="h-12 w-12 text-sand-50/50" aria-hidden />
      <div>
        <h1 className="font-display text-lg font-semibold text-sand-50">Couldn't load quest</h1>
        <p className="mt-1 text-sm text-sand-50/60">Check your connection and try again.</p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => navigate("/app/map")}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-sand-50/25 px-4 text-sm font-semibold"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Find quests
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-sand-50 px-4 text-sm font-semibold text-midnight-950"
        >
          <RefreshCw className="h-4 w-4" aria-hidden /> Retry
        </button>
      </div>
    </div>
  );
}

/** How the visitor reached this quest, captured once per page view. */
function arrivalContext(params: URLSearchParams, state: unknown) {
  const utm: QuestEventContext["utm"] = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign"] as const) {
    const value = params.get(key);
    if (value) utm[key] = value.slice(0, 100);
  }

  let referrerDomain: string | null = null;
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.origin !== window.location.origin) referrerDomain = ref.hostname.replace(/^www\./, "");
  } catch {
    /* ignore malformed referrer */
  }

  const from = (state as { from?: unknown } | null)?.from;
  const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  const source =
    params.get("via") ??
    (params.get("scan") ? "scan_link" : null) ??
    (typeof from === "string" ? from : null) ??
    (idx > 0 ? "in_app" : referrerDomain ? "external" : "direct");

  return { source, utm, referrerDomain };
}

function proofMethodLabel(method: ProofMethod | null | undefined): string {
  switch (method) {
    case "camera":
    case "photo":
      return "Snap a photo as proof — the camera opens right after you confirm.";
    case "staff_phrase":
      return "Show staff the phrase";
    case "breadcrumb":
      return "Leave a Community Note about your visit";
    case "qr":
      return "QR verified at venue";
    case "manual":
      return "Mark complete yourself";
    default:
      return "Complete at the venue";
  }
}

function proofMethodIcon(method: ProofMethod | null | undefined): React.ElementType {
  switch (method) {
    case "camera":
    case "photo":
      return Camera;
    case "staff_phrase":
    case "breadcrumb":
      return MessageSquare;
    case "qr":
      return QrCode;
    default:
      return CheckCircle2;
  }
}
