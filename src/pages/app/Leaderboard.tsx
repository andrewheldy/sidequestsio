import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, Medal } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { Loading, EmptyState } from "@/components/app/ui";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getRepository } from "@/lib/db";
import { track } from "@/lib/analytics/events";
import type { LeaderboardPeriod, LeaderboardScope } from "@/types/db";

const SCOPES: { id: LeaderboardScope; label: string }[] = [
  { id: "global", label: "Global" },
  { id: "city", label: "Miami" },
];
const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "all_time", label: "All-time" },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const [scope, setScope] = useState<LeaderboardScope>("global");
  const [period, setPeriod] = useState<LeaderboardPeriod>("all_time");

  useEffect(() => {
    track("leaderboard_viewed", { user_id: user?.id, props: { scope, period } });
  }, [scope, period, user?.id]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["leaderboard", scope, period, user?.id],
    queryFn: async () =>
      (await getRepository()).getLeaderboard({
        scope,
        scopeId: scope === "city" ? "Miami, FL" : null,
        period,
        selfUserId: user?.id ?? null,
        limit: 50,
      }),
  });

  return (
    <AppLayout title="Leaderboard">
      <Tabs items={SCOPES} value={scope} onChange={(v) => setScope(v as LeaderboardScope)} />
      <div className="mt-3">
        <Tabs items={PERIODS} value={period} onChange={(v) => setPeriod(v as LeaderboardPeriod)} />
      </div>

      <div className="mt-5">
        {isLoading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState title="No rankings yet" description="Complete quests to climb the board." />
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.user_id}
                className={cn(
                  "glass-card flex items-center gap-3 p-3",
                  row.is_self && "ring-2 ring-primary",
                )}
              >
                <span className="w-7 text-center font-poppins font-bold text-muted-foreground">
                  {row.rank === 1 ? (
                    <Crown className="mx-auto h-5 w-5 text-yellow-400" />
                  ) : row.rank <= 3 ? (
                    <Medal className="mx-auto h-5 w-5 text-amber-500" />
                  ) : (
                    row.rank
                  )}
                </span>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-muted text-xs">
                    {row.display_name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium text-foreground">
                  {row.display_name}
                  {row.is_self && <span className="ml-1 text-xs text-primary">(you)</span>}
                </span>
                <span className="font-poppins font-bold text-secondary">
                  {row.score.toLocaleString()} XP
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Tabs({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 rounded-xl bg-muted/40 p-1">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            "flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors",
            value === item.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
