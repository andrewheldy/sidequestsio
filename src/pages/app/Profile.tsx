import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Award,
  Camera,
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
import { useAuth, type Profile as ProfileType } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { MIAMI_QUESTS } from '@/data/miami/toQuest';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ProfileEditDialog } from '@/components/app/profile/ProfileEditDialog';
import { SocialLinksEditor } from '@/components/app/profile/SocialLinksEditor';
import {
  ActivitySection,
  ProfileSkeleton,
  StatTile,
  XpMeter,
  formatJoined,
} from '@/components/app/profile/parts';

/** Shown when the real profile row hasn't loaded yet (new account, fetch error, etc.). */
function buildFallbackProfile(userId: string, email: string | undefined): ProfileType {
  return {
    user_id: userId,
    display_name: email?.split('@')[0] ?? null,
    username: null,
    avatar_url: null,
    home_city: 'Miami',
    bio: null,
    instagram_url: null,
    tiktok_url: null,
    x_url: null,
    is_profile_public: false,
    show_social_links: false,
    show_completed_quests: false,
    show_breadcrumbs: false,
    interests: [],
    quest_style: null,
    quest_energy: null,
    starting_area: null,
    xp: 0,
    level: 1,
    streak: 0,
    onboarding_completed: false,
    created_at: null,
  };
}

const Profile = () => {
  const { user, profile, loading, signOut, updateProfile, refreshProfile } = useAuth();
  const { favorites } = useFavorites();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  const savedQuests = useMemo(
    () => MIAMI_QUESTS.filter((q) => favorites.includes(q.id)),
    [favorites],
  );

  if (loading) return <ProfileSkeleton />;

  // Fall back to a local stand-in when the profile row hasn't arrived yet so
  // the UI always renders. Edits will trigger a real upsert once the row exists.
  const effectiveProfile = profile ?? buildFallbackProfile(user?.id ?? '', user?.email);

  const name = effectiveProfile.display_name || user?.email?.split('@')[0] || 'Explorer';
  const joined = formatJoined(effectiveProfile.created_at);

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
    <div className="space-y-5 pb-8">
      {/* ── Profile header ────────────────────────────────────────────── */}
      <header className="glass-card overflow-hidden">
        {/* Decorative gradient banner */}
        <div
          aria-hidden
          className="h-16 bg-gradient-to-br from-coral/30 via-primary/10 to-turquoise/20"
        />

        <div className="flex flex-col items-center px-5 pb-6">
          {/* Avatar with edit affordance, overlapping the banner */}
          <div className="relative -mt-12 mb-3">
            <div className="h-24 w-24 overflow-hidden rounded-[22px] ring-2 ring-primary/40">
              {effectiveProfile.avatar_url ? (
                <img
                  src={effectiveProfile.avatar_url}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-coral to-turquoise text-3xl font-bold text-primary-foreground">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Camera edit badge */}
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              aria-label="Edit profile photo"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary shadow-md ring-2 ring-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Camera className="h-3.5 w-3.5 text-primary-foreground" />
            </button>
          </div>

          {/* Name & username */}
          <h1 className="font-poppins text-xl font-bold">{name}</h1>
          {effectiveProfile.username && (
            <p className="text-sm text-muted-foreground">@{effectiveProfile.username}</p>
          )}

          {/* Level · city · joined */}
          <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5 text-coral" /> Level {effectiveProfile.level}
            </span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {effectiveProfile.home_city || 'Miami'}
            </span>
          </p>
          {joined && <p className="mt-0.5 text-xs text-muted-foreground">{joined}</p>}

          {/* Bio */}
          {effectiveProfile.bio && (
            <p className="mx-auto mt-3 max-w-[300px] text-center text-sm text-foreground/90">
              {effectiveProfile.bio}
            </p>
          )}

          {/* Edit Profile */}
          <Button
            variant="outline"
            size="sm"
            className="mt-4 min-h-[44px] px-6"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
        </div>
      </header>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<Zap className="h-5 w-5 text-turquoise" />} value={`${effectiveProfile.xp}`} label="XP" />
        <StatTile icon={<Trophy className="h-5 w-5 text-coral" />} value={`Lv ${effectiveProfile.level}`} label="Level" />
        <StatTile icon={<Flame className="h-5 w-5 text-coral" />} value={`${effectiveProfile.streak}`} label="Day streak" />
      </div>

      <XpMeter xp={effectiveProfile.xp} level={effectiveProfile.level} />

      {/* ── Social links ─────────────────────────────────────────────── */}
      <SocialLinksEditor
        instagram={effectiveProfile.instagram_url}
        tiktok={effectiveProfile.tiktok_url}
        x={effectiveProfile.x_url}
      />

      {/* ── Quest activity ───────────────────────────────────────────── */}
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

      {/* ── Privacy controls ─────────────────────────────────────────── */}
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
          checked={effectiveProfile.is_profile_public}
          onChange={(v) => setPrivacy('is_profile_public', v)}
        />
        <PrivacyRow
          label="Show social links"
          desc="Display your Instagram, TikTok and X on your public profile."
          checked={effectiveProfile.show_social_links}
          disabled={!effectiveProfile.is_profile_public}
          onChange={(v) => setPrivacy('show_social_links', v)}
        />
        <PrivacyRow
          label="Show completed quests"
          desc="Share the quests you've finished."
          checked={effectiveProfile.show_completed_quests}
          disabled={!effectiveProfile.is_profile_public}
          onChange={(v) => setPrivacy('show_completed_quests', v)}
        />
        <PrivacyRow
          label="Show community notes"
          desc="Share the Breadcrumbs you've left behind."
          checked={effectiveProfile.show_breadcrumbs}
          disabled={!effectiveProfile.is_profile_public}
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

      <ProfileEditDialog profile={effectiveProfile} open={editOpen} onOpenChange={setEditOpen} />
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
