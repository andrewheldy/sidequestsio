import { useNavigate } from 'react-router-dom';
import { LogOut, MapPin, Trophy, Flame, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { EXPLORER_STYLES, NEIGHBORHOODS, VIBES } from '@/lib/onboarding';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const Profile = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Signed out', description: 'See you on the next quest.' });
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-center gap-3 pt-2 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-coral to-turquoise text-3xl">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={name} className="h-full w-full rounded-3xl object-cover" />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h1 className="font-poppins text-2xl font-bold">{name}</h1>
          <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {profile?.home_city ?? 'Miami'}
            {style && <span>· {style.emoji} {style.label}</span>}
          </p>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<Zap className="h-5 w-5 text-turquoise" />} value={`${xp}`} label="XP" />
        <StatTile icon={<Trophy className="h-5 w-5 text-coral" />} value={`Lv ${level}`} label="Level" />
        <StatTile icon={<Flame className="h-5 w-5 text-coral" />} value={`${streak}`} label="Day streak" />
      </div>

      {/* XP meter */}
      <div className="glass-card p-5">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium">Progress to Level {level + 1}</span>
          <span className="text-muted-foreground">{xp} / {nextLevelXp}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-coral to-turquoise transition-all"
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </div>

      {/* Interests */}
      <div className="glass-card p-5">
        <p className="mb-3 font-poppins font-semibold">Your interests</p>
        {interests.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {interests.map((v) => (
              <span key={v!.id} className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-3 py-1 text-sm">
                {v!.emoji} {v!.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No interests selected yet.</p>
        )}
        {area && (
          <p className="mt-4 text-sm text-muted-foreground">
            Home base: <span className="text-foreground">{area.emoji} {area.label}</span>
          </p>
        )}
      </div>

      <Button variant="outline" className="w-full" onClick={handleSignOut}>
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
};

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="glass-card flex flex-col items-center gap-1 p-4">
      {icon}
      <span className="font-poppins text-lg font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export default Profile;
