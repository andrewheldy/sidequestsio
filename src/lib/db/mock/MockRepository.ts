/**
 * MockRepository — read-only demo backend powered by static JSON files.
 * Used when VITE_DATA_SOURCE=mock. All writes are disabled or return stubs.
 */

import type {
  Repository,
  QuestFilter,
  RecordScanInput,
  CompleteQuestInput,
  CompleteQuestResult,
  RedeemRewardInput,
  RedeemRewardResult,
  CreateNoteInput,
  CreateNoteResult,
} from "../repository";
import type { AnalyticsSummary } from "../types";
import type {
  User,
  UserProfile,
  PrivacyPreferences,
  Partner,
  Venue,
  Quest,
  QuestWithContext,
  QrCode,
  ScanEvent,
  QuestAttempt,
  QuestCompletion,
  PointsLedgerEntry,
  Reward,
  RewardRedemption,
  CommunityNote,
  CommunityNoteWithAuthor,
  ConsentEvent,
  AuditLog,
  LeaderboardRow,
  ModerationStatus,
  LeaderboardScope,
  LeaderboardPeriod,
  EntityStatus,
} from "@/types/db";
import questsData from "@/data/mock/quests.json";
import notesData from "@/data/mock/community-notes.json";
import profileData from "@/data/mock/profile.json";

// ---------------------------------------------------------------------------
// Demo analytics data
// ---------------------------------------------------------------------------

const DEMO_ANALYTICS: AnalyticsSummary = {
  totalScans: 247,
  uniqueVisitors: 189,
  authenticatedVisitors: 134,
  completions: 89,
  conversionRate: 0.36,
  rewardsRedeemed: 23,
  communityNotes: 47,
  scansByDay: [
    { date: "2024-03-01", value: 28 },
    { date: "2024-03-02", value: 35 },
    { date: "2024-03-03", value: 41 },
    { date: "2024-03-04", value: 52 },
    { date: "2024-03-05", value: 38 },
    { date: "2024-03-06", value: 29 },
    { date: "2024-03-07", value: 24 },
  ],
  scansByQuest: [
    { id: "wynwood-coffee-crawl", label: "Hidden Wynwood Coffee Crawl", value: 48 },
    { id: "south-beach-sunrise", label: "South Beach Sunrise Reset", value: 37 },
    { id: "wynwood-mural-hunt", label: "Wynwood Walls Mural Hunt", value: 43 },
    { id: "little-havana-cafecito", label: "Little Havana Cafecito Trail", value: 31 },
    { id: "brickell-skyline-loop", label: "Brickell Skyline Night Walk", value: 29 },
    { id: "coconut-grove-bayfront", label: "Coconut Grove Bayfront Loop", value: 22 },
    { id: "design-district-gallery", label: "Design District Gallery Walk", value: 19 },
    { id: "downtown-legends", label: "Downtown Local Legends Quest", value: 11 },
    { id: "wynwood-sweet-caroline-karaoke", label: "Sweet Caroline Karaoke Night", value: 7 },
  ],
  scansByVenue: [
    { id: "venue-wynwood-coffee", label: "Wynwood Coffee Quarter", value: 48 },
    { id: "venue-south-beach", label: "South Beach Boardwalk", value: 37 },
    { id: "venue-wynwood-walls", label: "Wynwood Walls", value: 43 },
    { id: "venue-little-havana", label: "Calle Ocho Cultural Center", value: 31 },
    { id: "venue-brickell", label: "Brickell City Centre", value: 29 },
  ],
  suppressed: false,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEMO_PROFILE: UserProfile = profileData as UserProfile;

function buildQuestWithContext(q: any): QuestWithContext {
  const partner = (questsData as any).partners.find((p: any) => p.id === q.partner_id);
  const venue = q.venue_id
    ? (questsData as any).venues.find((v: any) => v.id === q.venue_id)
    : undefined;
  return { ...q, partner, venue } as QuestWithContext;
}

function defaultPrivacy(userId: string): PrivacyPreferences {
  return {
    user_id: userId,
    analytics_consent: true,
    marketing_consent: false,
    location_consent: true,
    leaderboard_visibility: "public",
    profile_visibility: "public",
  };
}

function stubId() {
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// MockRepository
// ---------------------------------------------------------------------------

export class MockRepository implements Repository {
  // --- Users ---------------------------------------------------------------

  async getUserById(_id: string): Promise<User | null> {
    return null;
  }

  async getUserByEmail(_email: string): Promise<User | null> {
    return null;
  }

  async upsertUser(_input: Partial<User> & { email: string }): Promise<User> {
    throw new Error("Demo mode — writes disabled");
  }

  async updateUser(_id: string, _patch: Partial<User>): Promise<User> {
    throw new Error("Demo mode — writes disabled");
  }

  async listUsers(): Promise<User[]> {
    return [];
  }

  // --- Profiles ------------------------------------------------------------

  async getProfile(_userId: string): Promise<UserProfile | null> {
    return DEMO_PROFILE;
  }

  async updateProfile(_userId: string, _patch: Partial<UserProfile>): Promise<UserProfile> {
    throw new Error("Demo mode — writes disabled");
  }

  // --- Privacy & consent ---------------------------------------------------

  async getPrivacy(userId: string): Promise<PrivacyPreferences> {
    return defaultPrivacy(userId);
  }

  async updatePrivacy(
    userId: string,
    patch: Partial<PrivacyPreferences>,
  ): Promise<PrivacyPreferences> {
    return { ...defaultPrivacy(userId), ...patch };
  }

  async recordConsent(input: {
    userId: string;
    consentType: any;
    granted: boolean;
    source: string;
  }): Promise<ConsentEvent> {
    return {
      id: stubId(),
      user_id: input.userId,
      consent_type: input.consentType,
      granted: input.granted,
      timestamp: new Date().toISOString(),
      source: input.source,
    };
  }

  // --- Partners & venues ---------------------------------------------------

  async listPartners(): Promise<Partner[]> {
    return (questsData as any).partners as Partner[];
  }

  async getPartner(id: string): Promise<Partner | null> {
    return (questsData as any).partners.find((p: any) => p.id === id) ?? null;
  }

  async getPartnerByOwner(_userId: string): Promise<Partner | null> {
    return null;
  }

  async upsertPartner(_input: Partial<Partner> & { name: string }): Promise<Partner> {
    throw new Error("Demo mode — writes disabled");
  }

  async listVenues(partnerId?: string): Promise<Venue[]> {
    const venues: Venue[] = (questsData as any).venues as Venue[];
    if (partnerId) return venues.filter((v) => v.partner_id === partnerId);
    return venues;
  }

  async getVenue(id: string): Promise<Venue | null> {
    return ((questsData as any).venues as Venue[]).find((v) => v.id === id) ?? null;
  }

  async upsertVenue(
    _input: Partial<Venue> & { partner_id: string; name: string },
  ): Promise<Venue> {
    throw new Error("Demo mode — writes disabled");
  }

  // --- Quests --------------------------------------------------------------

  async listQuests(filter?: QuestFilter): Promise<QuestWithContext[]> {
    let quests: any[] = (questsData as any).quests;

    if (filter?.category) {
      quests = quests.filter((q) => q.category === filter.category);
    }
    if (filter?.status) {
      quests = quests.filter((q) => q.status === filter.status);
    }
    if (filter?.partnerId) {
      quests = quests.filter((q) => q.partner_id === filter.partnerId);
    }

    return quests.map(buildQuestWithContext);
  }

  async getQuest(id: string): Promise<QuestWithContext | null> {
    const q = (questsData as any).quests.find((q: any) => q.id === id);
    if (!q) return null;
    return buildQuestWithContext(q);
  }

  async upsertQuest(
    _input: Partial<Quest> & { partner_id: string; title: string },
  ): Promise<Quest> {
    throw new Error("Demo mode — writes disabled");
  }

  // --- QR codes ------------------------------------------------------------

  async getQrByCode(code: string): Promise<QrCode | null> {
    return (
      ((questsData as any).qrCodes as QrCode[]).find((qr) => qr.code === code) ?? null
    );
  }

  async listQrCodes(_partnerId?: string): Promise<QrCode[]> {
    return (questsData as any).qrCodes as QrCode[];
  }

  async createQrCode(_input: {
    questId: string;
    partnerId: string;
    venueId?: string | null;
  }): Promise<QrCode> {
    throw new Error("Demo mode — writes disabled");
  }

  // --- Scans ---------------------------------------------------------------

  async recordScan(input: RecordScanInput): Promise<ScanEvent> {
    return {
      id: stubId(),
      qr_code_id: input.qrCodeId ?? null,
      quest_id: input.questId,
      venue_id: null,
      partner_id: "demo",
      user_id: input.userId ?? null,
      anonymous_session_id: input.anonymousSessionId,
      timestamp: new Date().toISOString(),
      device_type: "mobile",
      browser: null,
      operating_system: null,
      referrer: null,
      approximate_location: null,
      location_permission_granted: false,
      conversion_state: "scanned",
    };
  }

  async markScanConverted(_scanId: string, _state: ScanEvent["conversion_state"]): Promise<void> {
    // no-op in demo mode
  }

  async listScans(_filter?: {
    partnerId?: string;
    questId?: string;
    limit?: number;
  }): Promise<ScanEvent[]> {
    return [];
  }

  // --- Attempts & completion -----------------------------------------------

  async startQuest(_userId: string, questId: string): Promise<QuestAttempt> {
    return {
      id: stubId(),
      user_id: _userId,
      quest_id: questId,
      started_at: new Date().toISOString(),
      completed_at: null,
      status: "in_progress",
      verification_method: null,
      failure_reason: null,
    };
  }

  async hasCompleted(_userId: string, _questId: string): Promise<boolean> {
    return false;
  }

  async completeQuest(_input: CompleteQuestInput): Promise<CompleteQuestResult> {
    return { ok: false, error: "quest_inactive" as const };
  }

  async listCompletions(_userId: string): Promise<QuestCompletion[]> {
    return [];
  }

  // --- Points ledger -------------------------------------------------------

  async listLedger(_userId: string): Promise<PointsLedgerEntry[]> {
    return [];
  }

  async adjustPoints(_input: {
    userId: string;
    points: number;
    xp?: number;
    reason: string;
    actorId: string;
  }): Promise<PointsLedgerEntry> {
    throw new Error("Demo mode — writes disabled");
  }

  // --- Rewards -------------------------------------------------------------

  async listRewards(_filter?: {
    partnerId?: string;
    status?: EntityStatus;
  }): Promise<Reward[]> {
    return [];
  }

  async getReward(_id: string): Promise<Reward | null> {
    return null;
  }

  async upsertReward(
    _input: Partial<Reward> & { partner_id: string; title: string },
  ): Promise<Reward> {
    throw new Error("Demo mode — writes disabled");
  }

  async redeemReward(_input: RedeemRewardInput): Promise<RedeemRewardResult> {
    return { ok: false, error: "inactive" as const };
  }

  async listRedemptions(_filter: {
    userId?: string;
    partnerId?: string;
  }): Promise<RewardRedemption[]> {
    return [];
  }

  // --- Community notes -----------------------------------------------------

  async listNotesByQuest(questId: string): Promise<CommunityNoteWithAuthor[]> {
    return (notesData as any[])
      .filter((n) => n.quest_id === questId) as CommunityNoteWithAuthor[];
  }

  async createNote(_input: CreateNoteInput): Promise<CreateNoteResult> {
    return { ok: false, error: "not_completed" as const };
  }

  async listNotesForModeration(
    _status?: ModerationStatus,
  ): Promise<CommunityNoteWithAuthor[]> {
    return notesData as CommunityNoteWithAuthor[];
  }

  async setNoteModeration(_noteId: string, _status: ModerationStatus): Promise<void> {
    // no-op in demo mode
  }

  // --- Leaderboards --------------------------------------------------------

  async getLeaderboard(_input: {
    scope: LeaderboardScope;
    scopeId?: string | null;
    period: LeaderboardPeriod;
    selfUserId?: string | null;
    limit?: number;
  }): Promise<LeaderboardRow[]> {
    return [];
  }

  // --- Analytics -----------------------------------------------------------

  async getPartnerAnalytics(_partnerId: string): Promise<AnalyticsSummary> {
    return DEMO_ANALYTICS;
  }

  async getPlatformAnalytics(): Promise<AnalyticsSummary> {
    return DEMO_ANALYTICS;
  }

  // --- Audit ---------------------------------------------------------------

  async listAudit(_limit?: number): Promise<AuditLog[]> {
    return [];
  }

  async addAudit(input: {
    actorId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<AuditLog> {
    return {
      id: stubId(),
      actor_id: input.actorId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? null,
      created_at: new Date().toISOString(),
    };
  }
}
