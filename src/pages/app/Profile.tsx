import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { LogOut, Shield, BarChart3, Settings2 } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { StatTile, SectionHeader, Loading } from "@/components/app/ui";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { getRepository } from "@/lib/db";
import { levelProgress } from "@/lib/app/leveling";
import type { PrivacyPreferences } from "@/types/db";
import { toast } from "sonner";

export default function Profile() {
  const { user, profile, role, signOut } = useAuth();
  const qc = useQueryClient();

  const { data: privacy, isLoading } = useQuery({
    queryKey: ["privacy", user?.id],
    queryFn: async () => (await getRepository()).getPrivacy(user!.id),
    enabled: !!user,
  });

  const update = async (patch: Partial<PrivacyPreferences>) => {
    if (!user) return;
    const repo = await getRepository();
    await repo.updatePrivacy(user.id, patch);
    // Log consent changes for governance (Phase 14).
    for (const [k, v] of Object.entries(patch)) {
      if (k.endsWith("_consent") && typeof v === "boolean") {
        await repo.recordConsent({
          userId: user.id,
          consentType: k.replace("_consent", "") as never,
          granted: v,
          source: "profile_settings",
        });
      }
    }
    qc.invalidateQueries({ queryKey: ["privacy", user.id] });
    toast.success("Privacy settings updated");
  };

  const lvl = levelProgress(profile?.xp ?? 0);

  return (
    <AppLayout title="Profile">
      <div className="glass-card mt-2 flex items-center gap-4 p-5">
        <Avatar className="h-16 w-16 ring-2 ring-primary/50">
          <AvatarFallback className="bg-muted text-xl">
            {(user?.display_name ?? "Q").slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-poppins text-xl font-bold text-foreground">
            {user?.display_name}
          </h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
            {role}
          </span>
        </div>
      </div>

      <div className="glass-card mt-4 p-4">
        <div className="flex items-center justify-between">
          <span className="font-poppins font-semibold text-foreground">
            Level {lvl.level}
          </span>
          <span className="text-xs text-muted-foreground">
            {lvl.xpIntoLevel}/{lvl.nextLevelXp - lvl.currentLevelXp} XP
          </span>
        </div>
        <Progress value={lvl.progress * 100} className="mt-2 h-2" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatTile label="Points" value={profile?.points_balance_cache ?? 0} accent="coral" />
          <StatTile label="Quests" value={profile?.completed_quests_count ?? 0} accent="turquoise" />
          <StatTile label="Notes" value={profile?.community_notes_count ?? 0} />
        </div>
      </div>

      {/* Role-based shortcuts (RBAC) */}
      {(role === "partner" || role === "admin") && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(role === "partner" || role === "admin") && (
            <Button asChild variant="outline" className="gap-2">
              <Link to="/partner">
                <BarChart3 className="h-4 w-4" /> Partner Portal
              </Link>
            </Button>
          )}
          {role === "admin" && (
            <Button asChild variant="outline" className="gap-2">
              <Link to="/admin">
                <Shield className="h-4 w-4" /> Admin
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Privacy */}
      <div className="mt-6">
        <SectionHeader title="Privacy & Consent" />
        {isLoading || !privacy ? (
          <Loading />
        ) : (
          <div className="glass-card divide-y divide-border/50">
            <Row
              label="Show me on leaderboards"
              desc="Display name only — never your email."
              checked={privacy.leaderboard_visibility === "public"}
              onChange={(v) =>
                update({ leaderboard_visibility: v ? "public" : "private" })
              }
            />
            <Row
              label="Analytics"
              desc="Help partners measure aggregate, privacy-safe traffic."
              checked={privacy.analytics_consent}
              onChange={(v) => update({ analytics_consent: v })}
            />
            <Row
              label="Location for verification"
              desc="Used only to verify GPS check-ins. Coordinates are never stored."
              checked={privacy.location_consent}
              onChange={(v) => update({ location_consent: v })}
            />
            <Row
              label="Marketing emails"
              desc="Occasional updates about new quests & rewards."
              checked={privacy.marketing_consent}
              onChange={(v) => update({ marketing_consent: v })}
            />
          </div>
        )}
      </div>

      <Button variant="ghost" onClick={signOut} className="mt-6 w-full gap-2 text-destructive">
        <LogOut className="h-4 w-4" /> Sign out
      </Button>
      <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
        <Settings2 className="h-3 w-3" /> You control your data. Request export or
        deletion anytime.
      </p>
    </AppLayout>
  );
}

function Row({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
