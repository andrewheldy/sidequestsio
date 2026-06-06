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
import { Loading } from "@/components/app/ui";
import { CommunityNotes } from "@/components/app/CommunityNotes";
import { toast } from "sonner";
import type { CompleteQuestResult } from "@/lib/db/repository";

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
  const recordedRef = useRef(false);

  const { data: quest, isLoading } = useQuery({
    queryKey: ["quest", questId],
    queryFn: async () => (await getRepository()).getQuest(questId!),
    enabled: !!questId,
  });

  const { data: completed } = useQuery({
    queryKey: ["completed", questId, user?.id],
    queryFn: async () =>
      user ? (await getRepository()).hasCompleted(user.id, questId!) : false,
    enabled: !!questId && !!user,
  });

  // Organic visit (no scan in URL): still record a quest_viewed scan once.
  useEffect(() => {
    if (!questId || scanParam || recordedRef.current) return;
    recordedRef.current = true;
    (async () => {
      try {
        const res = await recordQuestScan(questId, user?.id ?? null);
        if (res.scan) setScanId(res.scan.id);
      } catch {
        // In demo mode, scan recording may be a no-op — ignore errors.
      }
    })();
  }, [questId, scanParam, user]);

  // Resume a pending scan after returning from auth.
  useEffect(() => {
    if (!isAuthenticated) return;
    const pending = getPendingScan();
    if (pending && pending.questId === questId) {
      setScanId(pending.scanId);
      clearPendingScan();
    }
  }, [isAuthenticated, questId]);

  if (isLoading) return <ShellWithLoader />;
  if (!quest)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-muted-foreground">
        Quest not found.
      </div>
    );

  const needsCode = quest.verification_type === "venue_code";

  const handleComplete = async () => {
    if (isDemoMode) {
      toast.info("Demo mode — saving disabled for now.");
      return;
    }
    if (!isAuthenticated || !user) {
      // Preserve scan context across the auth boundary.
      if (scanId) setPendingScan({ questId: quest.id, scanId });
      navigate(`/auth?next=${encodeURIComponent(`/quests/${quest.id}?scan=${scanId ?? ""}`)}`);
      return;
    }
    setBusy(true);
    const repo = await getRepository();
    await repo.startQuest(user.id, quest.id);
    track("quest_started", { quest_id: quest.id, user_id: user.id, partner_id: quest.partner_id });
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
      track("verification_failed", { quest_id: quest.id, user_id: user.id, props: { reason: res.error ?? "" } });
      const map: Record<string, string> = {
        already_completed: "You've already completed this quest.",
        verification_failed: needsCode
          ? "That venue code didn't match. Ask staff and try again."
          : "Verification failed. Please try again.",
        quest_inactive: "This quest isn't active right now.",
        quest_expired: "This quest has expired.",
        not_found: "Quest not found.",
      };
      toast.error(map[res.error ?? ""] ?? "Could not complete quest.");
      return;
    }

    track("verification_passed", { quest_id: quest.id, user_id: user.id });
    track("quest_completed", { quest_id: quest.id, user_id: user.id, partner_id: quest.partner_id });
    track("points_awarded", {
      quest_id: quest.id,
      user_id: user.id,
      props: { points: res.pointsAwarded ?? 0, xp: res.xpAwarded ?? 0 },
    });
    setResult(res);
    await refresh();
    qc.invalidateQueries({ queryKey: ["completed", questId, user.id] });
    toast.success(`+${res.xpAwarded} XP · +${res.pointsAwarded} points!`);
  };

  const isDone = completed || result?.ok;

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Hero */}
      <div className="relative h-64 w-full overflow-hidden">
        {quest.image_url && (
          <img
            src={quest.image_url}
            alt={quest.title}
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 rounded-full bg-background/60 p-2 backdrop-blur"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <Badge className="absolute left-4 top-16 bg-primary capitalize text-primary-foreground">
          {quest.category.replace("_", " ")}
        </Badge>
      </div>

      <div className="mx-auto -mt-10 w-full max-w-md px-4">
        <div className="glass-card p-5">
          <h1 className="font-poppins text-2xl font-bold text-foreground">
            {quest.title}
          </h1>
          {quest.venue && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              {quest.venue.name}
              {quest.venue.city ? ` · ${quest.venue.city}` : ""}
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <Reward icon={Zap} label="XP" value={quest.xp_reward} accent="turquoise" />
            <Reward icon={Star} label="Points" value={quest.points_reward} accent="coral" />
            <div className="flex flex-1 flex-col rounded-xl bg-muted/40 p-3">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3 w-3" /> Verify
              </span>
              <span className="font-poppins text-sm font-semibold capitalize text-foreground">
                {quest.verification_type.replace("_", " ")}
              </span>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {quest.description}
          </p>
        </div>

        {/* Completion / CTA */}
        <div className="mt-4">
          {isDone ? (
            <CompletedCard result={result} questId={quest.id} />
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
        </div>

        {/* Community notes */}
        <div className="mt-6">
          <CommunityNotes
            questId={quest.id}
            canPost={!!isDone && isAuthenticated}
          />
        </div>
      </div>
    </div>
  );
}

function Reward({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Zap;
  label: string;
  value: number;
  accent: "coral" | "turquoise";
}) {
  return (
    <div className="flex flex-1 flex-col rounded-xl bg-muted/40 p-3">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className={`h-3 w-3 ${accent === "coral" ? "text-primary" : "text-secondary"}`} />
        {label}
      </span>
      <span
        className={`font-poppins text-lg font-bold ${
          accent === "coral" ? "text-primary" : "text-secondary"
        }`}
      >
        +{value}
      </span>
    </div>
  );
}

function CompletedCard({
  result,
  questId,
}: {
  result: CompleteQuestResult | null;
  questId: string;
}) {
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

function ShellWithLoader() {
  return (
    <div className="min-h-screen bg-background">
      <Loading label="Loading quest…" />
    </div>
  );
}
