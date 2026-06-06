import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Flame, Star, Sparkles } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { SectionHeader, StatTile, Loading } from "@/components/app/ui";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { getRepository } from "@/lib/db";
import { levelProgress } from "@/lib/app/leveling";

export default function AppHome() {
  const { user, profile } = useAuth();

  const { data: quests = [], isLoading } = useQuery({
    queryKey: ["quests", "active"],
    queryFn: async () => (await getRepository()).listQuests({ status: "active" }),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["recent-notes"],
    queryFn: async () => {
      const repo = await getRepository();
      const all = await repo.listNotesForModeration("approved");
      return all.slice(0, 3);
    },
  });

  const lvl = levelProgress(profile?.xp ?? 0);

  return (
    <AppLayout hideHeader>
      <div className="pt-2">
        {/* Greeting */}
        <div className="flex items-start justify-between">
          <div>
            <span className="font-poppins text-xl font-extrabold italic text-gradient-coral">
              SIDEQUESTS
            </span>
            <h1 className="mt-3 font-poppins text-2xl font-bold text-foreground">
              Hey {user?.display_name ?? "Quester"}! 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              There's always a side quest to explore.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="glass-card mt-5 p-4">
          <div className="grid grid-cols-4 gap-2">
            <StatTile label="Level" value={lvl.level} accent="coral" sub={`${lvl.xpToNext} XP to L${lvl.level + 1}`} />
            <StatTile label="Quests" value={profile?.completed_quests_count ?? 0} accent="turquoise" sub="Completed" />
            <StatTile label="Points" value={profile?.points_balance_cache ?? 0} accent="coral" sub="Balance" />
            <StatTile
              label="Streak"
              value={<span className="flex items-center gap-1"><Flame className="h-5 w-5 text-orange-400" />7</span>}
              sub="days"
            />
          </div>
          <Progress value={lvl.progress * 100} className="mt-3 h-2" />
        </div>

        {/* Rewards ecosystem */}
        <Link to="/app/rewards" className="mt-4 block">
          <div className="glass-card relative overflow-hidden p-5 text-center glow-coral">
            <Badge className="absolute left-4 top-4 bg-secondary text-secondary-foreground">NEW</Badge>
            <h2 className="font-poppins text-lg font-bold text-secondary">
              THE REWARDS ECOSYSTEM
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Your adventures. Real rewards. Real impact.
            </p>
            <div className="mx-auto mt-4 flex w-fit items-center gap-3 rounded-2xl border border-secondary/40 px-6 py-3">
              <Star className="h-6 w-6 text-primary" />
              <div className="text-left">
                <p className="text-xs text-muted-foreground">YOUR POINTS</p>
                <p className="font-poppins text-2xl font-bold text-secondary">
                  {profile?.points_balance_cache ?? 0}
                </p>
              </div>
            </div>
          </div>
        </Link>

        {/* Nearby quests */}
        <div className="mt-6">
          <SectionHeader title="Nearby Quests" accent="Miami, FL" href="/app/quests" />
          {isLoading ? (
            <Loading />
          ) : (
            <div className="space-y-3">
              {quests.slice(0, 3).map((q) => (
                <Link key={q.id} to={`/quests/${q.id}`} className="block">
                  <div className="glass-card flex gap-3 overflow-hidden p-3 hover-lift">
                    {q.image_url && (
                      <img
                        src={q.image_url}
                        alt={q.title}
                        className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
                      />
                    )}
                    <div className="flex flex-1 flex-col">
                      <Badge className="w-fit bg-secondary/20 text-secondary capitalize">
                        {q.category.replace("_", " ")}
                      </Badge>
                      <p className="mt-1 font-poppins font-semibold text-foreground">
                        {q.title}
                      </p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {q.description}
                      </p>
                      <span className="mt-auto text-sm font-semibold text-secondary">
                        +{q.xp_reward} XP
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent community notes */}
        <div className="mt-6">
          <SectionHeader title="Recent Notes" href="/app/community-notes" />
          <div className="space-y-3">
            {notes.map((n) => (
              <div key={n.id} className="glass-card flex gap-3 p-3">
                <Sparkles className="mt-1 h-4 w-4 flex-shrink-0 text-secondary" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {n.author_display_name}
                  </p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {n.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
