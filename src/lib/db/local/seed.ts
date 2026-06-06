/**
 * Deterministic seed data for the LocalRepository and as a reference for
 * `supabase/seed.sql`. Ids are stable, human-readable slugs so relationships
 * are easy to follow while developing.
 */

import type { DbSnapshot } from "./store";
import { xpForLevel, levelForXp } from "@/lib/app/leveling";

const now = "2026-06-01T12:00:00.000Z";

function profileFor(userId: string, xp: number, points: number, city: string) {
  return {
    user_id: userId,
    home_city: city,
    xp,
    level: levelForXp(xp),
    points_balance_cache: points,
    lifetime_points: points,
    completed_quests_count: 0,
    community_notes_count: 0,
    rewards_redeemed_count: 0,
  };
}

export function buildSeed(): DbSnapshot {
  return {
    users: [
      {
        id: "user-demo",
        email: "quester@sidequests.io",
        display_name: "Quester",
        avatar_url: null,
        role: "user",
        created_at: now,
        last_active_at: now,
        account_status: "active",
      },
      {
        id: "user-mia",
        email: "mia@example.com",
        display_name: "mia_quester",
        avatar_url: null,
        role: "user",
        created_at: now,
        last_active_at: now,
        account_status: "active",
      },
      {
        id: "user-jordan",
        email: "jordan@example.com",
        display_name: "traveljordan",
        avatar_url: null,
        role: "user",
        created_at: now,
        last_active_at: now,
        account_status: "active",
      },
      {
        id: "user-partner",
        email: "partner@wynwood.example",
        display_name: "Wynwood Partner",
        avatar_url: null,
        role: "partner",
        created_at: now,
        last_active_at: now,
        account_status: "active",
      },
      {
        id: "user-admin",
        email: "admin@sidequests.io",
        display_name: "SideQuests Admin",
        avatar_url: null,
        role: "admin",
        created_at: now,
        last_active_at: now,
        account_status: "active",
      },
    ],

    profiles: [
      { ...profileFor("user-demo", xpForLevel(12) + 240, 2500, "Miami, FL"), completed_quests_count: 24, community_notes_count: 3, rewards_redeemed_count: 1 },
      { ...profileFor("user-mia", 8200, 4100, "Miami, FL"), completed_quests_count: 41 },
      { ...profileFor("user-jordan", 6400, 3050, "Miami, FL"), completed_quests_count: 33 },
      profileFor("user-partner", 0, 0, "Miami, FL"),
      profileFor("user-admin", 0, 0, "Miami, FL"),
    ],

    privacy: [
      defaultPrivacy("user-demo"),
      defaultPrivacy("user-mia"),
      defaultPrivacy("user-jordan"),
      defaultPrivacy("user-partner"),
      defaultPrivacy("user-admin"),
    ],

    partners: [
      {
        id: "partner-wynwood",
        name: "Wynwood Arts District",
        type: "venue",
        contact_email: "partner@wynwood.example",
        status: "active",
        owner_user_id: "user-partner",
        created_at: now,
      },
      {
        id: "partner-vice",
        name: "Vice City Coffee Co.",
        type: "brand",
        contact_email: "hello@vicecity.example",
        status: "active",
        owner_user_id: null,
        created_at: now,
      },
    ],

    venues: [
      {
        id: "venue-walls",
        partner_id: "partner-wynwood",
        name: "Wynwood Walls",
        address: "2516 NW 2nd Ave",
        city: "Miami, FL",
        latitude: 25.8011,
        longitude: -80.1994,
        status: "active",
      },
      {
        id: "venue-beans",
        partner_id: "partner-vice",
        name: "Vice City Beans",
        address: "120 Collins Ave",
        city: "Miami, FL",
        latitude: 25.7825,
        longitude: -80.1303,
        status: "active",
      },
      {
        id: "venue-pointe",
        partner_id: "partner-wynwood",
        name: "South Pointe Park",
        address: "1 Washington Ave",
        city: "Miami, FL",
        latitude: 25.7617,
        longitude: -80.1308,
        status: "active",
      },
    ],

    quests: [
      {
        id: "quest-wynwood",
        partner_id: "partner-wynwood",
        venue_id: "venue-walls",
        title: "Wynwood Walls",
        description:
          "Explore iconic street art & leave your mark. Find the hidden mural behind the main wall and scan the code to check in.",
        category: "art",
        difficulty: "easy",
        xp_reward: 50,
        points_reward: 100,
        status: "active",
        start_date: null,
        end_date: null,
        verification_type: "qr",
        verification_secret: null,
        image_url:
          "https://images.unsplash.com/photo-1569700296499-d5671c74cb3d?w=800&h=600&fit=crop",
        created_at: now,
      },
      {
        id: "quest-beans",
        partner_id: "partner-vice",
        venue_id: "venue-beans",
        title: "Vice City Beans",
        description:
          "Find the secret menu item and check in. Ask the barista for the passphrase and enter the venue code.",
        category: "food",
        difficulty: "medium",
        xp_reward: 40,
        points_reward: 80,
        status: "active",
        start_date: null,
        end_date: null,
        verification_type: "venue_code",
        verification_secret: "SUNRISE",
        image_url:
          "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop",
        created_at: now,
      },
      {
        id: "quest-sunset",
        partner_id: "partner-wynwood",
        venue_id: "venue-pointe",
        title: "Sunset Chase",
        description:
          "Catch the sunset and leave a Community Note. Check in at South Pointe Park before dusk.",
        category: "outdoors",
        difficulty: "easy",
        xp_reward: 60,
        points_reward: 120,
        status: "active",
        start_date: null,
        end_date: null,
        verification_type: "gps",
        verification_secret: null,
        image_url:
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop",
        created_at: now,
      },
    ],

    qrCodes: [
      {
        id: "qr-wynwood",
        quest_id: "quest-wynwood",
        venue_id: "venue-walls",
        partner_id: "partner-wynwood",
        code: "WYNWOOD1",
        destination_url: "/q/quest-wynwood",
        status: "active",
        created_at: now,
      },
      {
        id: "qr-beans",
        quest_id: "quest-beans",
        venue_id: "venue-beans",
        partner_id: "partner-vice",
        code: "BEANS1",
        destination_url: "/q/quest-beans",
        status: "active",
        created_at: now,
      },
      {
        id: "qr-sunset",
        quest_id: "quest-sunset",
        venue_id: "venue-pointe",
        partner_id: "partner-wynwood",
        code: "SUNSET1",
        destination_url: "/q/quest-sunset",
        status: "active",
        created_at: now,
      },
    ],

    rewards: [
      {
        id: "reward-coffee",
        partner_id: "partner-vice",
        title: "Free Cold Brew",
        description: "Redeem for one free cold brew at Vice City Beans.",
        points_cost: 500,
        inventory: 50,
        status: "active",
        expiration_date: null,
        image_url:
          "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&h=400&fit=crop",
      },
      {
        id: "reward-print",
        partner_id: "partner-wynwood",
        title: "Limited Art Print",
        description: "A signed Wynwood Walls art print from a featured artist.",
        points_cost: 1500,
        inventory: 10,
        status: "active",
        expiration_date: null,
        image_url:
          "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=600&h=400&fit=crop",
      },
      {
        id: "reward-tour",
        partner_id: "partner-wynwood",
        title: "VIP Gallery Tour",
        description: "Skip-the-line VIP guided tour of the Wynwood galleries.",
        points_cost: 2500,
        inventory: 5,
        status: "active",
        expiration_date: null,
        image_url:
          "https://images.unsplash.com/photo-1577720580479-7d839d829c73?w=600&h=400&fit=crop",
      },
    ],

    notes: [
      {
        id: "note-1",
        user_id: "user-mia",
        quest_id: "quest-sunset",
        venue_id: "venue-pointe",
        content:
          "Sunset was unreal tonight 🌅 Bring a blanket and good company.",
        image_url:
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=200&fit=crop",
        moderation_status: "approved",
        created_at: now,
      },
      {
        id: "note-2",
        user_id: "user-jordan",
        quest_id: "quest-wynwood",
        venue_id: "venue-walls",
        content: "Hidden spot behind the main wall is a must-see!",
        image_url:
          "https://images.unsplash.com/photo-1569700296499-d5671c74cb3d?w=200&h=200&fit=crop",
        moderation_status: "approved",
        created_at: now,
      },
    ],

    ledger: [],
    attempts: [],
    completions: [],
    redemptions: [],
    scans: [],
    consents: [],
    audit: [],
  };
}

function defaultPrivacy(userId: string) {
  return {
    user_id: userId,
    analytics_consent: true,
    marketing_consent: false,
    location_consent: false,
    leaderboard_visibility: "public" as const,
    profile_visibility: "public" as const,
  };
}
