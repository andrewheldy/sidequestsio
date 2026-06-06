import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Ticket, Lock } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { SectionHeader, EmptyState, Loading } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { getRepository } from "@/lib/db";
import { track } from "@/lib/analytics/events";
import { toast } from "sonner";

export default function Rewards() {
  const { user, profile, refresh } = useAuth();
  const qc = useQueryClient();
  const balance = profile?.points_balance_cache ?? 0;

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ["rewards", "active"],
    queryFn: async () => (await getRepository()).listRewards({ status: "active" }),
  });

  const { data: redemptions = [] } = useQuery({
    queryKey: ["redemptions", user?.id],
    queryFn: async () =>
      (await getRepository()).listRedemptions({ userId: user!.id }),
    enabled: !!user,
  });

  const redeem = async (rewardId: string) => {
    if (!user) return;
    const repo = await getRepository();
    track("reward_viewed", { user_id: user.id, props: { reward_id: rewardId } });
    const res = await repo.redeemReward({ userId: user.id, rewardId });
    if (!res.ok) {
      const map: Record<string, string> = {
        insufficient_points: "Not enough points yet — keep questing!",
        out_of_stock: "This reward is out of stock.",
        inactive: "This reward isn't available.",
        expired: "This reward has expired.",
        not_found: "Reward not found.",
      };
      toast.error(map[res.error ?? ""] ?? "Could not redeem.");
      return;
    }
    track("reward_redeemed", { user_id: user.id, props: { reward_id: rewardId } });
    await refresh();
    qc.invalidateQueries({ queryKey: ["redemptions", user.id] });
    qc.invalidateQueries({ queryKey: ["rewards", "active"] });
    toast.success(`Redeemed! Code: ${res.redemption?.redemption_code}`);
  };

  return (
    <AppLayout title="Rewards">
      <div className="glass-card mt-2 flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">Available to spend</p>
          <p className="font-poppins text-2xl font-bold text-secondary">{balance} pts</p>
        </div>
        <Gift className="h-8 w-8 text-primary" />
      </div>

      <div className="mt-6">
        <SectionHeader title="Available Rewards" />
        {isLoading ? (
          <Loading />
        ) : (
          <div className="space-y-3">
            {rewards.map((r) => {
              const affordable = balance >= r.points_cost;
              const soldOut = r.inventory !== null && r.inventory <= 0;
              return (
                <div key={r.id} className="glass-card overflow-hidden">
                  <div className="flex gap-3 p-3">
                    {r.image_url && (
                      <img
                        src={r.image_url}
                        alt={r.title}
                        className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
                      />
                    )}
                    <div className="flex flex-1 flex-col">
                      <p className="font-poppins font-semibold text-foreground">
                        {r.title}
                      </p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {r.description}
                      </p>
                      <div className="mt-auto flex items-center justify-between">
                        <Badge className="bg-secondary/20 text-secondary">
                          {r.points_cost} pts
                        </Badge>
                        <Button
                          size="sm"
                          disabled={!affordable || soldOut}
                          onClick={() => redeem(r.id)}
                          className="gap-1"
                        >
                          {!affordable ? <Lock className="h-3 w-3" /> : null}
                          {soldOut ? "Sold out" : affordable ? "Redeem" : "Locked"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6">
        <SectionHeader title="My Redemptions" />
        {redemptions.length === 0 ? (
          <EmptyState title="No redemptions yet" description="Redeem points for real rewards." />
        ) : (
          <div className="space-y-2">
            {redemptions.map((red) => (
              <div key={red.id} className="glass-card flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <Ticket className="h-5 w-5 text-secondary" />
                  <div>
                    <p className="font-mono text-sm font-semibold text-foreground">
                      {red.redemption_code}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(red.redeemed_at).toLocaleDateString()} · -{red.points_spent} pts
                    </p>
                  </div>
                </div>
                <Badge className="bg-muted capitalize text-muted-foreground">
                  {red.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
