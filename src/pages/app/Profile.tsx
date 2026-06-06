import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, Flame, Gift, Loader2, LogOut, MapPin, Trophy, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { EXPLORER_STYLES, NEIGHBORHOODS, VIBES } from '@/lib/onboarding';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Reward {
  id: string;
  title: string;
  description: string | null;
  cost_points: number;
  type: string;
}

interface LeaderboardEntry {
  user_id: string;
  rank: number;
  points: number;
  xp: number;
}

const Profile = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [points, setPoints] = useState(0);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [claimCode, setClaimCode] = useState<string | null>(null);

  const name = profile?.display_name || user?.email?.split('@')[0] || 'Explorer';
  const style = EXPLORER_STYLES.find((s) => s.id === profile?.quest_style);
  const area = NEIGHBORHOODS.find((n) => n.id === profile?.starting_area);
  const interests = (profile?.interests ?? [])
    .map((id) => VIBES.find((v) => v.id === id))
    .filter(Boolean);

  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const streak = profile?.streak ?? 0;
  const nextLevelXp = level * 250;
  const xpPct = Math.min(100, Math.round((xp / nextLevelXp) * 100));

  useEffect(() => {
    if (!supabase || !user) return;

    // Points balance
    setPointsLoading(true);
    supabase
      .rpc('current_points')
      .then(({ data }) => {
        if (typeof data === 'number') setPoints(data);
      })
      .finally(() => setPointsLoading(false));

    // Leaderboard (global all-time, most recent snapshot date)
    supabase
      .from('leaderboard_snapshots')
      .select('user_id, rank, points, xp')
      .eq('scope', 'global')
      .eq('period', 'all_time')
      .order('snapshot_date', { ascending: false })
      .order('rank', { ascending: true })
      .limit(10)
      .then(({ data }) => {
        if (data) setLeaderboard(data as LeaderboardEntry[]);
      });

    // Active rewards
    supabase
      .from('rewards')
      .select('id, title, description, cost_points, type')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) setRewards(data as Reward[]);
      });
  }, [user]);

  const handleRedeem = async (reward: Reward) => {
    if (!supabase || redeemingId) return;
    if (points < reward.cost_points) {
      toast({
        title: 'Not enough points',
        description: `You need ${reward.cost_points} points but have ${points}.`,
        variant: 'destructive',
      });
      return;
    }
    setRedeemingId(reward.id);
    const { data, error } = await supabase.rpc('redeem_reward', { p_reward_id: reward.id });
    setRedeemingId(null);
    if (error) {
      toast({ title: 'Redemption failed', description: error.message, variant: 'destructive' });
    } else {
      setClaimCode(data.code as string);
      setPoints((prev) => prev - reward.cost_points);
      toast({ title: 'Reward redeemed! 🎁', description: reward.title });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Signed out', description: 'See you on the next quest.' });
    navigate('/');
  };

const Profile = () => {
  const { user, profile, loading, signOut, updateProfile } = useAuth();
  const { favorites } = useFavorites();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col items-center gap-3 pt-2 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-coral to-turquoise text-3xl font-bold text-white">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={name}
              className="h-full w-full rounded-3xl object-cover"
            />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h1 className="font-poppins text-2xl font-bold">{name}</h1>
          <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {profile?.home_city ?? 'Miami'}
            {style && <span>· {style.emoji} {style.label}</span>}
          </p>
        </div>
      </header>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          icon={<Coins className="h-5 w-5 text-coral" />}
          value={pointsLoading ? '…' : `${points}`}
          label="Points"
        />
        <StatTile
          icon={<Zap className="h-5 w-5 text-turquoise" />}
          value={`${xp}`}
          label="XP"
        />
        <StatTile
          icon={<Trophy className="h-5 w-5 text-coral" />}
          value={`Lv ${level}`}
          label="Level"
        />
        <StatTile
          icon={<Flame className="h-5 w-5 text-orange-400" />}
          value={`${streak}`}
          label="Day streak"
        />
      </div>

      {/* XP progress */}
      <div className="glass-card p-5">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium">Progress to Level {level + 1}</span>
          <span className="text-muted-foreground">{xp} / {nextLevelXp} XP</span>
        </div>
        <Progress value={lvl.progress * 100} className="mt-2 h-2" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatTile label="Points" value={profile?.points_balance_cache ?? 0} accent="coral" />
          <StatTile label="Quests" value={profile?.completed_quests_count ?? 0} accent="turquoise" />
          <StatTile label="Notes" value={profile?.community_notes_count ?? 0} />
        </div>

      {/* Interests */}
      <div className="glass-card p-5">
        <p className="mb-3 font-poppins font-semibold">Your interests</p>
        {interests.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {interests.map((v) => (
              <span
                key={v!.id}
                className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-3 py-1 text-sm"
              >
                {v!.emoji} {v!.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No interests selected yet.</p>
        )}
        {area && (
          <p className="mt-4 text-sm text-muted-foreground">
            Home base:{' '}
            <span className="text-foreground">
              {area.emoji} {area.label}
            </span>
          </p>
        )}
      </div>

      {/* Rewards */}
      <div className="glass-card p-5">
        <p className="mb-3 font-poppins font-semibold">Rewards shop</p>
        {rewards.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No rewards available yet — check back soon!
          </p>
        ) : (
          <div className="space-y-3">
            {rewards.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl bg-muted/30 p-3"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="truncate font-medium">{r.title}</p>
                  {r.description && (
                    <p className="truncate text-xs text-muted-foreground">{r.description}</p>
                  )}
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-coral">
                    <Coins className="h-3 w-3" />
                    {r.cost_points} points
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={points >= r.cost_points ? 'default' : 'outline'}
                  disabled={redeemingId === r.id || points < r.cost_points}
                  onClick={() => handleRedeem(r)}
                  className="shrink-0"
                >
                  {redeemingId === r.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Gift className="h-4 w-4" />
                  )}
                  <span className="ml-1.5">
                    {redeemingId === r.id ? 'Redeeming…' : 'Redeem'}
                  </span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="glass-card p-5">
        <p className="mb-3 font-poppins font-semibold">Global leaderboard</p>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Leaderboard updates daily — complete quests to claim your rank!
          </p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, i) => {
              const isMe = entry.user_id === user?.id;
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                    isMe ? 'bg-primary/10 font-semibold' : 'bg-muted/20'
                  }`}
                >
                  <span className="w-7 text-center font-mono text-xs text-muted-foreground">
                    {medal ?? `#${entry.rank}`}
                  </span>
                  <span className="flex-1 truncate">
                    {isMe ? 'You' : `Explorer`}
                  </span>
                  <span className="flex items-center gap-1 text-turquoise">
                    <Zap className="h-3.5 w-3.5" />
                    {entry.xp}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </header>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<Zap className="h-5 w-5 text-turquoise" />} value={`${xp}`} label="XP" />
        <StatTile icon={<Trophy className="h-5 w-5 text-coral" />} value={`Lv ${level}`} label="Level" />
        <StatTile icon={<Flame className="h-5 w-5 text-coral" />} value={`${streak}`} label="Day streak" />
      </div>

      <XpMeter xp={xp} level={level} />

      {/* ── Quest activity ─────────────────────────────────────────────── */}
      <ActivitySection
        icon={<Compass className="h-4 w-4" />}
        title="Completed Quests"
        count={0}
        emptyText="No quests completed yet. Your next side quest is waiting."
      />

      <ActivitySection
        icon={<MessageSquare className="h-4 w-4" />}
        title="Community Notes"
        count={0}
        emptyText="No community notes yet. Leave your mark after your first quest."
      />

      <ActivitySection
        icon={<Award className="h-4 w-4" />}
        title="Rewards Earned"
        count={0}
        emptyText="No rewards yet. Complete quests to start stacking perks."
      />

      <ActivitySection
        icon={<Heart className="h-4 w-4" />}
        title="Saved Quests"
        count={savedQuests.length}
        emptyText="Nothing saved yet. Tap the heart on a quest to keep it here."
      >
        {savedQuests.length > 0 && (
          <ul className="space-y-2">
            {savedQuests.slice(0, 5).map((q) => (
              <li key={q.id}>
                <Link
                  to="/app/favorites"
                  className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                >
                  <span className="truncate">{q.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{q.neighborhood}</span>
                </Link>
              </li>
            ))}
            {savedQuests.length > 5 && (
              <li className="pt-1 text-center text-xs text-muted-foreground">
                <Link to="/app/favorites" className="hover:text-foreground">
                  View all {savedQuests.length} saved
                </Link>
              </li>
            )}
          </ul>
        )}
      </ActivitySection>

      {/* ── Privacy ────────────────────────────────────────────────────── */}
      <section className="glass-card divide-y divide-border/50">
        <div className="p-5 pb-3">
          <h2 className="font-poppins font-semibold">Public Profile</h2>
          <p className="text-xs text-muted-foreground">
            You're in control. Nothing is shared until you switch it on.
          </p>
        </div>
        <PrivacyRow
          label="Show profile publicly"
          desc="Let others view your profile at its public link."
          checked={profile?.is_profile_public ?? false}
          disabled={!profile}
          onChange={(v) => setPrivacy('is_profile_public', v)}
        />
        <PrivacyRow
          label="Show social links"
          desc="Display your Instagram, TikTok and X on your public profile."
          checked={profile?.show_social_links ?? false}
          disabled={!profile || !profile.is_profile_public}
          onChange={(v) => setPrivacy('show_social_links', v)}
        />
        <PrivacyRow
          label="Show completed quests"
          desc="Share the quests you've finished."
          checked={profile?.show_completed_quests ?? false}
          disabled={!profile || !profile.is_profile_public}
          onChange={(v) => setPrivacy('show_completed_quests', v)}
        />
        <PrivacyRow
          label="Show community notes"
          desc="Share the Breadcrumbs you've left behind."
          checked={profile?.show_breadcrumbs ?? false}
          disabled={!profile || !profile.is_profile_public}
          onChange={(v) => setPrivacy('show_breadcrumbs', v)}
        />
      </section>

      <Button
        variant="outline"
        className="min-h-[44px] w-full"
        onClick={async () => {
          await signOut();
          toast('Signed out', { description: 'See you on the next quest.' });
          navigate('/');
        }}
      >
        <LogOut className="mr-2 h-4 w-4" /> Sign out
      </Button>

      {/* Claim code dialog */}
      <Dialog open={claimCode !== null} onOpenChange={(v) => { if (!v) setClaimCode(null); }}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="font-poppins text-xl">🎁 Your Claim Code</DialogTitle>
            <DialogDescription>
              Show this code to the venue to redeem your reward.
            </DialogDescription>
          </DialogHeader>
          <div className="my-2 rounded-xl bg-muted/40 p-5">
            <p className="font-mono text-2xl font-bold tracking-widest text-primary">
              {claimCode}
            </p>
          </div>
          <Button className="w-full" onClick={() => setClaimCode(null)}>
            Got it!
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function PrivacyRow({
  label,
  desc,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className={disabled ? 'opacity-50' : undefined}>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-label={label}
      />
    </div>
  );
}

export default Profile;
