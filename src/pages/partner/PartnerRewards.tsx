import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { PARTNER_NAV } from "@/components/dashboard/navs";
import { Loading, EmptyState } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { usePartner } from "@/lib/partner/usePartner";
import { getRepository } from "@/lib/db";
import { toast } from "sonner";

export default function PartnerRewards() {
  const { data: partner } = usePartner();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ["partner-rewards", partner?.id],
    queryFn: async () => (await getRepository()).listRewards({ partnerId: partner!.id }),
    enabled: !!partner,
  });

  const { data: redemptions = [] } = useQuery({
    queryKey: ["partner-redemptions", partner?.id],
    queryFn: async () => (await getRepository()).listRedemptions({ partnerId: partner!.id }),
    enabled: !!partner,
  });

  return (
    <DashboardLayout title="Partner Portal" nav={PARTNER_NAV}>
      <div className="flex items-center justify-between">
        <h1 className="font-poppins text-2xl font-bold text-foreground">Rewards</h1>
        {partner && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1">
                <Plus className="h-4 w-4" /> New reward
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create reward</DialogTitle>
              </DialogHeader>
              <CreateRewardForm
                partnerId={partner.id}
                onCreated={() => {
                  setOpen(false);
                  qc.invalidateQueries({ queryKey: ["partner-rewards", partner.id] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-poppins font-semibold text-foreground">Catalog</h2>
          {isLoading ? (
            <Loading />
          ) : rewards.length === 0 ? (
            <EmptyState title="No rewards yet" />
          ) : (
            <div className="space-y-2">
              {rewards.map((r) => (
                <div key={r.id} className="glass-card flex items-center justify-between p-3">
                  <div>
                    <p className="font-semibold text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.points_cost} pts · {r.inventory === null ? "∞" : r.inventory} left
                    </p>
                  </div>
                  <Badge className="capitalize">{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-2 font-poppins font-semibold text-foreground">
            Recent redemptions
          </h2>
          {redemptions.length === 0 ? (
            <EmptyState title="No redemptions yet" />
          ) : (
            <div className="space-y-2">
              {redemptions.slice(0, 10).map((red) => (
                <div key={red.id} className="glass-card flex items-center justify-between p-3">
                  <span className="font-mono text-sm text-foreground">{red.redemption_code}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(red.redeemed_at).toLocaleDateString()} · -{red.points_spent} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function CreateRewardForm({
  partnerId,
  onCreated,
}: {
  partnerId: string;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ title: "", description: "", points_cost: 500, inventory: 50 });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    const repo = await getRepository();
    await repo.upsertReward({
      partner_id: partnerId,
      title: form.title,
      description: form.description,
      points_cost: Number(form.points_cost),
      inventory: Number(form.inventory),
      status: "active",
    });
    setBusy(false);
    toast.success("Reward created");
    onCreated();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input placeholder="Title" value={form.title} onChange={(e) => set("title", e.target.value)} required />
      <Textarea placeholder="Description" value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">
          <span className="text-muted-foreground">Points cost</span>
          <Input type="number" min={1} value={form.points_cost} onChange={(e) => set("points_cost", Number(e.target.value))} className="mt-1" />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Inventory</span>
          <Input type="number" min={0} value={form.inventory} onChange={(e) => set("inventory", Number(e.target.value))} className="mt-1" />
        </label>
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        Create reward
      </Button>
    </form>
  );
}
