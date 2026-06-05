import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { QrCode, ArrowRight } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { SectionHeader, Loading } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRepository } from "@/lib/db";
import { toast } from "sonner";

/**
 * Check-in entry point. A native app would open the camera here; on the web we
 * let questers type the code printed under the QR, or pick a nearby quest.
 */
export default function CheckIn() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const { data: quests = [], isLoading } = useQuery({
    queryKey: ["quests", "active"],
    queryFn: async () => (await getRepository()).listQuests({ status: "active" }),
  });

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    navigate(`/scan/${encodeURIComponent(code.trim())}`);
  };

  return (
    <AppLayout title="Check In">
      <div className="glass-card mt-2 flex flex-col items-center gap-3 p-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-coral text-primary-foreground glow-coral">
          <QrCode className="h-8 w-8" />
        </span>
        <p className="text-sm text-muted-foreground">
          Scan a SideQuests code at a venue, or enter it manually below.
        </p>
        <form onSubmit={go} className="flex w-full gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter code (e.g. WYNWOOD1)"
            className="bg-muted/50 uppercase"
          />
          <Button type="submit" disabled={!code.trim()}>
            Go
          </Button>
        </form>
      </div>

      <div className="mt-6">
        <SectionHeader title="Or pick a nearby quest" />
        {isLoading ? (
          <Loading />
        ) : (
          <div className="space-y-2">
            {quests.map((q) => (
              <button
                key={q.id}
                onClick={() => navigate(`/quests/${q.id}`)}
                className="glass-card flex w-full items-center justify-between p-3 text-left hover-lift"
              >
                <div>
                  <p className="font-poppins font-semibold text-foreground">{q.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {q.venue?.name ?? "—"} · +{q.xp_reward} XP
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-secondary" />
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
