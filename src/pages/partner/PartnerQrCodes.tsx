import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Copy } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { PARTNER_NAV } from "@/components/dashboard/navs";
import { Loading, EmptyState } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { usePartner } from "@/lib/partner/usePartner";
import { getRepository } from "@/lib/db";
import { toast } from "sonner";

export default function PartnerQrCodes() {
  const { data: partner } = usePartner();
  const qc = useQueryClient();

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["partner-qr", partner?.id],
    queryFn: async () => (await getRepository()).listQrCodes(partner!.id),
    enabled: !!partner,
  });

  const { data: quests = [] } = useQuery({
    queryKey: ["partner-quests-min", partner?.id],
    queryFn: async () => (await getRepository()).listQuests({ partnerId: partner!.id }),
    enabled: !!partner,
  });

  const generate = async (questId: string, venueId: string | null) => {
    if (!partner) return;
    const repo = await getRepository();
    await repo.createQrCode({ questId, partnerId: partner.id, venueId });
    qc.invalidateQueries({ queryKey: ["partner-qr", partner.id] });
    toast.success("QR code generated");
  };

  const scanUrl = (code: string) => `${window.location.origin}/scan/${code}`;

  return (
    <DashboardLayout title="Partner Portal" nav={PARTNER_NAV}>
      <h1 className="font-poppins text-2xl font-bold text-foreground">QR Codes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Each code links a physical scan to a quest and records attribution.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-poppins font-semibold text-foreground">Generate</h2>
          {quests.length === 0 ? (
            <EmptyState title="Create a quest first" />
          ) : (
            <div className="space-y-2">
              {quests.map((q) => (
                <div key={q.id} className="glass-card flex items-center justify-between p-3">
                  <span className="text-sm text-foreground">{q.title}</span>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => generate(q.id, q.venue_id)}>
                    <Plus className="h-3 w-3" /> Generate
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-2 font-poppins font-semibold text-foreground">Active codes</h2>
          {isLoading ? (
            <Loading />
          ) : codes.length === 0 ? (
            <EmptyState title="No codes yet" />
          ) : (
            <div className="space-y-3">
              {codes.map((c) => (
                <div key={c.id} className="glass-card flex items-center gap-3 p-3">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(scanUrl(c.code))}`}
                    alt={`QR for ${c.code}`}
                    className="h-16 w-16 rounded bg-white p-1"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono font-semibold text-foreground">{c.code}</p>
                    <p className="truncate text-xs text-muted-foreground">{scanUrl(c.code)}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(scanUrl(c.code));
                      toast.success("Link copied");
                    }}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Copy link"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
