import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowDownRight, Star } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { SectionHeader, EmptyState, Loading } from "@/components/app/ui";
import { useAuth } from "@/contexts/AuthContext";
import { getRepository } from "@/lib/db";

export default function Wallet() {
  const { user, profile } = useAuth();

  const { data: ledger = [], isLoading } = useQuery({
    queryKey: ["ledger", user?.id],
    queryFn: async () => (await getRepository()).listLedger(user!.id),
    enabled: !!user,
  });

  return (
    <AppLayout title="Wallet">
      <div className="glass-card mt-2 p-6 text-center glow-coral">
        <Star className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Points balance</p>
        <p className="font-poppins text-4xl font-bold text-secondary">
          {profile?.points_balance_cache ?? 0}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {profile?.lifetime_points ?? 0} lifetime points earned
        </p>
      </div>

      <div className="mt-6">
        <SectionHeader title="Transaction History" />
        {isLoading ? (
          <Loading />
        ) : ledger.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            description="Complete quests to start earning points."
          />
        ) : (
          <div className="space-y-2">
            {ledger.map((entry) => {
              const isCredit = entry.points_amount >= 0;
              return (
                <div
                  key={entry.id}
                  className="glass-card flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${
                        isCredit ? "bg-secondary/20 text-secondary" : "bg-primary/20 text-primary"
                      }`}
                    >
                      {isCredit ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-medium capitalize text-foreground">
                        {entry.source.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString()}
                        {entry.xp_amount > 0 ? ` · +${entry.xp_amount} XP` : ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-poppins font-bold ${
                      isCredit ? "text-secondary" : "text-primary"
                    }`}
                  >
                    {isCredit ? "+" : ""}
                    {entry.points_amount}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
