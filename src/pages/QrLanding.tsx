import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { recordQuestScan, type ScanError } from "@/lib/quests/scanFlow";
import { useAuth } from "@/contexts/AuthContext";
import { ScanErrorView } from "./ScanResolve";

/** /q/:questId — short link target (e.g. encoded directly in a QR / NFC tag). */
export default function QrLanding() {
  const { questId } = useParams<{ questId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<ScanError | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (loading || ran.current || !questId) return;
    ran.current = true;
    (async () => {
      const res = await recordQuestScan(questId, user?.id ?? null);
      if (res.quest) {
        navigate(`/quests/${res.quest.id}?scan=${res.scan?.id ?? ""}`, {
          replace: true,
        });
      } else {
        setError(res.error ?? "quest_not_found");
      }
    })();
  }, [questId, user, loading, navigate]);

  if (error) return <ScanErrorView error={error} />;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-muted-foreground">Opening quest…</p>
    </div>
  );
}
