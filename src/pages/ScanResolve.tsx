import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { resolveByCode, SCAN_ERROR_COPY, type ScanError } from "@/lib/quests/scanFlow";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate as useNav } from "react-router-dom";

/** /scan/:code — resolves a physical QR code to its quest. */
export default function ScanResolve() {
  const { code } = useParams<{ code: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<ScanError | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (loading || ran.current || !code) return;
    ran.current = true;
    (async () => {
      const res = await resolveByCode(code, user?.id ?? null);
      if (res.quest) {
        navigate(
          `/quests/${res.quest.id}?scan=${res.scan?.id ?? ""}&via=qr`,
          { replace: true },
        );
      } else {
        setError(res.error ?? "invalid_qr");
      }
    })();
  }, [code, user, loading, navigate]);

  if (error) return <ScanErrorView error={error} />;
  return <ResolvingView />;
}

function ResolvingView() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-muted-foreground">Resolving your quest…</p>
    </div>
  );
}

export function ScanErrorView({ error }: { error: ScanError }) {
  const nav = useNav();
  const copy = SCAN_ERROR_COPY[error];
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <span className="font-poppins text-4xl">🧭</span>
      <h1 className="font-poppins text-2xl font-bold text-foreground">{copy.title}</h1>
      <p className="max-w-sm text-muted-foreground">{copy.body}</p>
      <Button onClick={() => nav("/quests")} className="mt-2">
        Explore quests
      </Button>
    </div>
  );
}
