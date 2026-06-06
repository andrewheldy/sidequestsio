import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Award, Compass, MapPin, MessageSquare, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SocialLinks } from '@/components/app/profile/SocialLinks';
import {
  ActivitySection,
  ProfileSkeleton,
  StatTile,
  XpMeter,
  formatJoined,
} from '@/components/app/profile/parts';

interface PublicProfileRow {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  home_city: string | null;
  bio: string | null;
  level: number;
  xp: number;
  created_at: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  x_handle: string | null;
  youtube_url: string | null;
  snapchat_url: string | null;
  show_completed_quests: boolean;
  show_breadcrumbs: boolean;
}

/**
 * Public, read-only view of another user's profile. Reads exclusively from the
 * privacy-safe `public_profiles` view, so it can only ever show what the owner
 * chose to make public.
 */
const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-profile', username],
    enabled: Boolean(username),
    queryFn: async (): Promise<PublicProfileRow | null> => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('public_profiles')
        .select('*')
        .eq('username', (username ?? '').toLowerCase())
        .maybeSingle();
      if (error) throw error;
      return (data as PublicProfileRow) ?? null;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-md px-4 pb-16 pt-6">
        <Link
          to="/app/explore"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Explore
        </Link>

        {isLoading ? (
          <ProfileSkeleton />
        ) : !data || isError ? (
          <NotFound />
        ) : (
          <PublicProfileView profile={data} />
        )}
      </main>
    </div>
  );
};

function PublicProfileView({ profile }: { profile: PublicProfileRow }) {
  const name = profile.display_name || profile.username || 'Explorer';
  const joined = formatJoined(profile.created_at);
  const hasSocial = Boolean(
    profile.instagram_handle || profile.tiktok_handle || profile.x_handle ||
    profile.youtube_url || profile.snapchat_url,
  );

  return (
    <div className="space-y-5">
      {/* ── Profile header ──────────────────────────────────────────── */}
      <header className="glass-card overflow-hidden">
        {/* Decorative gradient banner */}
        <div
          aria-hidden
          className="h-16 bg-gradient-to-br from-coral/30 via-primary/10 to-turquoise/20"
        />

        <div className="flex flex-col items-center px-5 pb-6 text-center">
          {/* Avatar, overlapping the banner */}
          <div className="-mt-12 mb-3 h-24 w-24 overflow-hidden rounded-[22px] ring-2 ring-primary/40">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-coral to-turquoise text-3xl font-bold text-primary-foreground">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <h1 className="font-poppins text-xl font-bold">{name}</h1>
          {profile.username && (
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          )}

          <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5 text-coral" /> Level {profile.level}
            </span>
            {profile.home_city && (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {profile.home_city}
                </span>
              </>
            )}
          </p>
          {joined && <p className="mt-0.5 text-xs text-muted-foreground">{joined}</p>}

          {profile.bio && (
            <p className="mx-auto mt-3 max-w-[300px] text-sm text-foreground/90">
              {profile.bio}
            </p>
          )}

          {hasSocial && (
            <div className="mt-4">
              <SocialLinks
                instagram_handle={profile.instagram_handle}
                tiktok_handle={profile.tiktok_handle}
                x_handle={profile.x_handle}
                youtube_url={profile.youtube_url}
                snapchat_url={profile.snapchat_url}
              />
            </div>
          )}
        </div>
      </header>

      {/* ── Stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile icon={<Trophy className="h-5 w-5 text-coral" />} value={`Lv ${profile.level}`} label="Level" />
        <StatTile icon={<Award className="h-5 w-5 text-turquoise" />} value={`${profile.xp}`} label="XP" />
      </div>

      <XpMeter xp={profile.xp} level={profile.level} />

      {/* ── Activity (only shown if owner opted in) ──────────────────── */}
      {profile.show_completed_quests && (
        <ActivitySection
          icon={<Compass className="h-4 w-4" />}
          title="Completed Quests"
          count={0}
          emptyText="No completed quests to show yet."
        />
      )}
      {profile.show_breadcrumbs && (
        <ActivitySection
          icon={<MessageSquare className="h-4 w-4" />}
          title="Community Notes"
          count={0}
          emptyText="No community notes to show yet."
        />
      )}
    </div>
  );
}

function NotFound() {
  return (
    <div className="glass-card flex flex-col items-center gap-2 p-8 text-center">
      <p className="font-poppins text-lg font-semibold">Nothing to see here</p>
      <p className="text-sm text-muted-foreground">
        This explorer's trail is private — or hasn't been blazed yet.
      </p>
      <Link to="/app/explore" className="mt-2 text-sm text-primary hover:underline">
        Back to Explore
      </Link>
    </div>
  );
}

export default PublicProfile;
