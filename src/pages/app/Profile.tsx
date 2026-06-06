import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Award,
  Compass,
  Flame,
  Heart,
  LogOut,
  MapPin,
  MessageSquare,
  Pencil,
  Trophy,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { MIAMI_QUESTS } from '@/data/miami/toQuest';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SocialLinks } from '@/components/app/profile/SocialLinks';
import { ProfileEditDialog } from '@/components/app/profile/ProfileEditDialog';
import {
  ActivitySection,
  ProfileSkeleton,
  StatTile,
  XpMeter,
  formatJoined,
} from '@/components/app/profile/parts';

const Profile = () => {
  const { user, profile, loading, signOut, updateProfile } = useAuth();
  const { favorites } = useFavorites();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  const savedQuests = useMemo(
    () => MIAMI_QUESTS.filter((q) => favorites.includes(q.id)),
    [favorites],
  );

  if (loading || !profile) return <ProfileSkeleton />;

  const name = profile.display_name || user?.email?.split('@')[0] || 'Explorer';
  const joined = formatJoined(profile.created_at);
  const hasSocial = Boolean(profile.instagram_url || profile.tiktok_url || profile.x_url);

  const setPrivacy = async (
    key:
      | 'is_profile_public'
      | 'show_social_links'
      | 'show_completed_quests'
      | 'show_breadcrumbs',
    value: boolean,
  ) => {
    const { error } = await updateProfile({ [key]: value });
    if (error) toast.error(error);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="glass-card flex flex-col items-center gap-3 p-5 text-center">
        <div className="h-24 w-24 overflow-hidden rounded-3xl ring-2 ring-primary/40">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-coral to-turquoise text-3xl font-bold text-primary-foreground">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div>
          <h1 className="font-poppins text-2xl font-bold">{name}</h1>
          {profile.username && (
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          )}
          <p className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5 text-coral" /> Level {profile.level}
            </span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {profile.home_city || 'Miami'}
            </span>
          </p>
          {joined && <p className="mt-0.5 text-xs text-muted-foreground">{joined}</p>}
        </div>

        {profile.bio && <p className="max-w-prose text-sm text-foreground/90">{profile.bio}</p>}

        {hasSocial && (
          <SocialLinks
            instagram={profile.instagram_url}
            tiktok={profile.tiktok_url}
            x={profile.x_url}
          />
        )}

        <Button
          variant="outline"
          className="mt-1 min-h-[44px] w-full sm:w-auto"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="mr-2 h-4 w-4" /> Edit Profile
        </Button>
      </header>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<Zap className="h-5 w-5 text-turquoise" />} value={`${profile.xp}`} label="XP" />
        <StatTile icon={<Trophy className="h-5 w-5 text-coral" />} value={`Lv ${profile.level}`} label="Level" />
        <StatTile icon={<Flame className="h-5 w-5 text-coral" />} value={`${profile.streak}`} label="Day streak" />
      </div>

      <XpMeter xp={profile.xp} level={profile.level} />

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
          checked={profile.is_profile_public}
          onChange={(v) => setPrivacy('is_profile_public', v)}
        />
        <PrivacyRow
          label="Show social links"
          desc="Display your Instagram, TikTok and X on your public profile."
          checked={profile.show_social_links}
          disabled={!profile.is_profile_public}
          onChange={(v) => setPrivacy('show_social_links', v)}
        />
        <PrivacyRow
          label="Show completed quests"
          desc="Share the quests you've finished."
          checked={profile.show_completed_quests}
          disabled={!profile.is_profile_public}
          onChange={(v) => setPrivacy('show_completed_quests', v)}
        />
        <PrivacyRow
          label="Show community notes"
          desc="Share the Breadcrumbs you've left behind."
          checked={profile.show_breadcrumbs}
          disabled={!profile.is_profile_public}
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

      <ProfileEditDialog profile={profile} open={editOpen} onOpenChange={setEditOpen} />
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
