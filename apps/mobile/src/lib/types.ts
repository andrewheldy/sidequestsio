/**
 * Mobile data contracts. A portable subset of the website's src/types/db.ts and
 * src/contexts/AuthContext.tsx `Profile`, limited to what this MVP reads/writes.
 * Shapes mirror supabase/migrations; ids are opaque strings.
 */

export type EntityStatus = 'draft' | 'active' | 'paused' | 'archived';
export type QuestCategory =
  | 'art'
  | 'food'
  | 'outdoors'
  | 'culture'
  | 'nightlife'
  | 'shopping'
  | 'fitness'
  | 'hidden_gem';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type VerificationType = 'qr' | 'nfc' | 'gps' | 'venue_code' | 'staff_approval';
export type ProofMethod = 'camera' | 'photo' | 'staff_phrase' | 'breadcrumb' | 'qr' | 'manual';
export type Visibility = 'public' | 'friends' | 'private';

export interface Venue {
  id: string;
  partner_id: string;
  name: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  status: EntityStatus;
  logo_url?: string | null;
  neighborhood?: string | null;
  hours?: string | null;
  hours_note?: string | null;
  price_range?: string | null;
  description?: string | null;
  image_url?: string | null;
}

export interface Partner {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'suspended';
}

/** quests.links JSONB (0012). All optional. `action_points` is display-only and never credited. */
export interface QuestLinks {
  website_url?: string | null;
  reviews_url?: string | null;
  google_reviews_url?: string | null;
  socials_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  x_url?: string | null;
  facebook_url?: string | null;
  menu_url?: string | null;
  reservation_url?: string | null;
  contact_phone?: string | null;
  special_deals?: string | null;
}

export interface Quest {
  id: string;
  partner_id: string;
  venue_id: string | null;
  title: string;
  description: string;
  category: QuestCategory;
  difficulty: Difficulty;
  xp_reward: number;
  points_reward: number;
  status: EntityStatus;
  start_date: string | null;
  end_date: string | null;
  verification_type: VerificationType;
  image_url: string | null;
  created_at: string;
  funky_action?: string | null;
  action_prompt?: string | null;
  proof_method?: ProofMethod | null;
  estimated_time?: string | null;
  repeat_cooldown_days?: number | null;
  links?: QuestLinks | null;
}

export interface QuestWithContext extends Quest {
  partner?: Partner | null;
  venue?: Venue | null;
}

/**
 * public.profiles — identity, onboarding and consent (0001/0002/0011/0015).
 * Its xp/level/streak columns are written by web onboarding, not by quest
 * completion, so they are NOT used for progression: see `Progress`.
 */
export interface AccountProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  home_city: string | null;
  bio: string | null;
  interests: string[];
  quest_style: string | null;
  quest_energy: string | null;
  starting_area: string | null;
  onboarding_completed: boolean;
  is_public: boolean;
  show_completed_quests: boolean;
  created_at: string | null;
  terms_version: string | null;
  privacy_version: string | null;
  accepted_terms_at: string | null;
  accepted_privacy_at: string | null;
  marketing_opt_in: boolean;
  marketing_opt_in_at: string | null;
}

/** Columns a user may edit on their own profiles row (mirrors web EditableProfile). */
export type EditableProfileField =
  | 'display_name'
  | 'username'
  | 'avatar_url'
  | 'home_city'
  | 'bio'
  | 'is_public'
  | 'show_completed_quests';

/** public.user_profiles — server-maintained progression; complete_quest/redeem_reward update it. */
export interface Progress {
  user_id: string;
  xp: number;
  level: number;
  points_balance_cache: number;
  lifetime_points: number;
  completed_quests_count: number;
  rewards_redeemed_count: number;
}

export interface PrivacyPreferences {
  user_id: string;
  analytics_consent: boolean;
  marketing_consent: boolean;
  location_consent: boolean;
  leaderboard_visibility: Visibility;
  profile_visibility: Visibility;
}

export interface QuestCompletion {
  id: string;
  user_id: string;
  quest_id: string;
  venue_id: string | null;
  partner_id: string;
  completed_at: string;
  xp_awarded: number;
  points_awarded: number;
  source_scan_id: string | null;
  instance_id?: string | null;
}

export interface Reward {
  id: string;
  partner_id: string;
  title: string;
  description: string;
  points_cost: number;
  inventory: number | null;
  status: EntityStatus;
  expiration_date: string | null;
  image_url: string | null;
}
