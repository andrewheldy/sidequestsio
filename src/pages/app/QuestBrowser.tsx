import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { Loading, EmptyState } from "@/components/app/ui";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getRepository } from "@/lib/db";
import { MIAMI_QUESTS } from "@/data/miami/toQuest";
import type { QuestCategory, QuestWithContext } from "@/types/db";

const CATEGORIES: (QuestCategory | "all")[] = [
  "all",
  "food",
  "culture",
  "nightlife",
  "outdoors",
  "hidden_gem",
  "fitness",
  "art",
];

const CATEGORY_MAP: Record<string, QuestCategory> = {
  Foodie: "food",
  Culture: "culture",
  Nightlife: "nightlife",
  Wellness: "fitness",
  Outdoor: "outdoors",
  Community: "culture",
  "Hidden Gems": "hidden_gem",
  Art: "art",
};

function miamiToContext(q: (typeof MIAMI_QUESTS)[0]): QuestWithContext {
  return {
    id: q.id,
    partner_id: "local",
    venue_id: `venue-${q.id}`,
    title: q.title,
    description: (q as any).concept ?? `Discover ${q.title} in ${q.neighborhood}.`,
    category: (CATEGORY_MAP[q.category] ?? "culture") as QuestCategory,
    difficulty: "easy",
    xp_reward: q.xp,
    points_reward: Math.floor(q.xp / 2),
    status: "active",
    start_date: null,
    end_date: null,
    verification_type: "qr",
    verification_secret: null,
    image_url: q.image,
    created_at: new Date().toISOString(),
    venue: {
      id: `venue-${q.id}`,
      partner_id: "local",
      name: q.neighborhood,
      address: q.address ?? null,
      city: "Miami",
      latitude: q.lat,
      longitude: q.lng,
      status: "active",
    },
  };
}

const FALLBACK_QUESTS = MIAMI_QUESTS.map(miamiToContext);

export default function QuestBrowser() {
  const [category, setCategory] = useState<QuestCategory | "all">("all");

  const { data: repoQuests, isLoading, isError } = useQuery({
    queryKey: ["browse-quests"],
    queryFn: async () => {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000),
      );
      const fetch = getRepository().then((r) => r.listQuests({ status: "active" }));
      return Promise.race([fetch, timeout]);
    },
    retry: 0,
  });

  // Use repo data when available; fall back to static MIAMI_QUESTS when
  // the query errors, times out, or returns empty (schema not ready yet).
  const allQuests: QuestWithContext[] =
    repoQuests && repoQuests.length > 0 ? repoQuests : FALLBACK_QUESTS;

  const filtered =
    category === "all" ? allQuests : allQuests.filter((q) => q.category === category);

  return (
    <AppLayout title="Quests" subtitle="Discover side quests near you">
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              category === c
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {c === "hidden_gem" ? "Hidden Gems" : c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState title="No quests here yet" description="Try another category." />
      ) : (
        <div className="space-y-4">
          {filtered.map((q) => (
            <Link key={q.id} to={`/quests/${q.id}`} className="block">
              <div className="glass-card overflow-hidden hover-lift">
                {q.image_url && (
                  <div className="relative h-40">
                    <img
                      src={q.image_url}
                      alt={q.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    <Badge className="absolute left-3 top-3 bg-primary capitalize text-primary-foreground">
                      {q.category === "hidden_gem"
                        ? "Hidden Gem"
                        : q.category.replace("_", " ")}
                    </Badge>
                    <Badge className="absolute right-3 top-3 bg-secondary text-secondary-foreground">
                      +{q.xp_reward} XP
                    </Badge>
                  </div>
                )}
                <div className="p-4">
                  <p className="font-poppins font-semibold text-foreground">{q.title}</p>
                  {q.venue && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 text-primary" /> {q.venue.name}
                    </p>
                  )}
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {q.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
