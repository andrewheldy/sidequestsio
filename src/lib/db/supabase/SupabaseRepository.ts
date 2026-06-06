/**
 * SupabaseRepository — production implementation of the Repository contract.
 *
 * Reads map directly onto tables (RLS enforces who can see what). Atomic,
 * abuse-sensitive mutations (quest completion, reward redemption, note creation,
 * analytics rollups) are delegated to SECURITY DEFINER Postgres functions
 * defined in `supabase/migrations/0003_functions.sql`, so the integrity rules
 * live next to the data and cannot be bypassed by a tampered client.
 *
 * This implementation is activated only when VITE_SUPABASE_URL is set; the app
 * otherwise uses the LocalRepository. It is intentionally a thin, mechanical
 * mapping of the same shapes the LocalRepository returns.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuditLog,
  CommunityNoteWithAuthor,
  ConsentEvent,
  ConsentType,
  EntityStatus,
  LeaderboardPeriod,
  LeaderboardRow,
  LeaderboardScope,
  ModerationStatus,
  Partner,
  PointsLedgerEntry,
  PrivacyPreferences,
  Quest,
  QuestAttempt,
  QuestCompletion,
  QuestWithContext,
  QrCode,
  Reward,
  RewardRedemption,
  ScanEvent,
  User,
  UserProfile,
  Venue,
} from "@/types/db";
import type {
  CompleteQuestInput,
  CompleteQuestResult,
  CreateNoteInput,
  CreateNoteResult,
  QuestFilter,
  RecordScanInput,
  RedeemRewardInput,
  RedeemRewardResult,
  Repository,
} from "../repository";
import type { AnalyticsSummary } from "../types";
import { detectDevice, getReferrer } from "@/lib/app/device";

export class SupabaseRepository implements Repository {
  constructor(private readonly sb: SupabaseClient) {}

  private async one<T>(query: PromiseLike<{ data: T | null; error: unknown }>) {
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
  private async many<T>(query: PromiseLike<{ data: T[] | null; error: unknown }>) {
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  // --- Users -------------------------------------------------------------
  getUserById(id: string) {
    return this.one<User>(this.sb.from("users").select("*").eq("id", id).maybeSingle());
  }
  getUserByEmail(email: string) {
    return this.one<User>(
      this.sb.from("users").select("*").ilike("email", email).maybeSingle(),
    );
  }
  async upsertUser(input: Partial<User> & { email: string }) {
    return (await this.one<User>(
      this.sb.from("users").upsert(input, { onConflict: "email" }).select().single(),
    ))!;
  }
  async updateUser(id: string, patch: Partial<User>) {
    return (await this.one<User>(
      this.sb.from("users").update(patch).eq("id", id).select().single(),
    ))!;
  }
  listUsers() {
    return this.many<User>(
      this.sb.from("users").select("*").order("created_at", { ascending: false }),
    );
  }

  // --- Profiles ----------------------------------------------------------
  getProfile(userId: string) {
    return this.one<UserProfile>(
      this.sb.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
    );
  }
  async updateProfile(userId: string, patch: Partial<UserProfile>) {
    return (await this.one<UserProfile>(
      this.sb.from("user_profiles").update(patch).eq("user_id", userId).select().single(),
    ))!;
  }

  // --- Privacy & consent -------------------------------------------------
  async getPrivacy(userId: string) {
    const p = await this.one<PrivacyPreferences>(
      this.sb.from("privacy_preferences").select("*").eq("user_id", userId).maybeSingle(),
    );
    return (
      p ?? {
        user_id: userId,
        analytics_consent: true,
        marketing_consent: false,
        location_consent: false,
        leaderboard_visibility: "public",
        profile_visibility: "public",
      }
    );
  }
  async updatePrivacy(userId: string, patch: Partial<PrivacyPreferences>) {
    return (await this.one<PrivacyPreferences>(
      this.sb
        .from("privacy_preferences")
        .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" })
        .select()
        .single(),
    ))!;
  }
  async recordConsent(input: {
    userId: string;
    consentType: ConsentType;
    granted: boolean;
    source: string;
  }) {
    return (await this.one<ConsentEvent>(
      this.sb
        .from("consent_events")
        .insert({
          user_id: input.userId,
          consent_type: input.consentType,
          granted: input.granted,
          source: input.source,
        })
        .select()
        .single(),
    ))!;
  }

  // --- Partners & venues -------------------------------------------------
  listPartners() {
    return this.many<Partner>(this.sb.from("partners").select("*"));
  }
  getPartner(id: string) {
    return this.one<Partner>(this.sb.from("partners").select("*").eq("id", id).maybeSingle());
  }
  getPartnerByOwner(userId: string) {
    return this.one<Partner>(
      this.sb.from("partners").select("*").eq("owner_user_id", userId).maybeSingle(),
    );
  }
  async upsertPartner(input: Partial<Partner> & { name: string }) {
    return (await this.one<Partner>(
      this.sb.from("partners").upsert(input).select().single(),
    ))!;
  }
  listVenues(partnerId?: string) {
    let q = this.sb.from("venues").select("*");
    if (partnerId) q = q.eq("partner_id", partnerId);
    return this.many<Venue>(q);
  }
  getVenue(id: string) {
    return this.one<Venue>(this.sb.from("venues").select("*").eq("id", id).maybeSingle());
  }
  async upsertVenue(input: Partial<Venue> & { partner_id: string; name: string }) {
    return (await this.one<Venue>(this.sb.from("venues").upsert(input).select().single()))!;
  }

  // --- Quests ------------------------------------------------------------
  async listQuests(filter: QuestFilter = {}) {
    let q = this.sb.from("quests").select("*, partner:partners(*), venue:venues(*)");
    if (filter.status) q = q.eq("status", filter.status);
    if (filter.category) q = q.eq("category", filter.category);
    if (filter.partnerId) q = q.eq("partner_id", filter.partnerId);
    const rows = await this.many<QuestWithContext>(q);
    return filter.city ? rows.filter((r) => r.venue?.city === filter.city) : rows;
  }
  getQuest(id: string) {
    return this.one<QuestWithContext>(
      this.sb
        .from("quests")
        .select("*, partner:partners(*), venue:venues(*)")
        .eq("id", id)
        .maybeSingle(),
    );
  }
  async upsertQuest(input: Partial<Quest> & { partner_id: string; title: string }) {
    return (await this.one<Quest>(this.sb.from("quests").upsert(input).select().single()))!;
  }

  // --- QR codes ----------------------------------------------------------
  getQrByCode(code: string) {
    return this.one<QrCode>(
      this.sb.from("qr_codes").select("*").ilike("code", code).maybeSingle(),
    );
  }
  listQrCodes(partnerId?: string) {
    let q = this.sb.from("qr_codes").select("*");
    if (partnerId) q = q.eq("partner_id", partnerId);
    return this.many<QrCode>(q);
  }
  async createQrCode(input: { questId: string; partnerId: string; venueId?: string | null }) {
    return (await this.one<QrCode>(
      this.sb
        .rpc("create_qr_code", {
          p_quest_id: input.questId,
          p_partner_id: input.partnerId,
          p_venue_id: input.venueId ?? null,
        })
        .single(),
    ))!;
  }

  // --- Scans -------------------------------------------------------------
  async recordScan(input: RecordScanInput) {
    const device = detectDevice();
    return (await this.one<ScanEvent>(
      this.sb
        .rpc("record_scan", {
          p_quest_id: input.questId,
          p_qr_code_id: input.qrCodeId ?? null,
          p_anonymous_session_id: input.anonymousSessionId,
          p_device_type: device.device_type,
          p_browser: device.browser,
          p_operating_system: device.operating_system,
          p_referrer: getReferrer(),
        })
        .single(),
    ))!;
  }
  async markScanConverted(scanId: string, state: ScanEvent["conversion_state"]) {
    const { error } = await this.sb
      .from("scan_events")
      .update({ conversion_state: state })
      .eq("id", scanId);
    if (error) throw error;
  }
  listScans(filter: { partnerId?: string; questId?: string; limit?: number } = {}) {
    let q = this.sb.from("scan_events").select("*").order("timestamp", { ascending: false });
    if (filter.partnerId) q = q.eq("partner_id", filter.partnerId);
    if (filter.questId) q = q.eq("quest_id", filter.questId);
    if (filter.limit) q = q.limit(filter.limit);
    return this.many<ScanEvent>(q);
  }

  // --- Attempts & completion --------------------------------------------
  async startQuest(userId: string, questId: string) {
    return (await this.one<QuestAttempt>(
      this.sb.rpc("start_quest", { p_quest_id: questId }).single(),
    ))!;
  }
  async hasCompleted(userId: string, questId: string) {
    const { count, error } = await this.sb
      .from("quest_completions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("quest_id", questId);
    if (error) throw error;
    return (count ?? 0) > 0;
  }
  async completeQuest(input: CompleteQuestInput): Promise<CompleteQuestResult> {
    const { data, error } = await this.sb.rpc("complete_quest", {
      p_quest_id: input.questId,
      p_verification_method: input.verificationMethod,
      p_venue_code: input.venueCode ?? null,
      p_source_scan_id: input.sourceScanId ?? null,
    });
    if (error) throw error;
    return data as CompleteQuestResult;
  }
  listCompletions(userId: string) {
    return this.many<QuestCompletion>(
      this.sb
        .from("quest_completions")
        .select("*")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false }),
    );
  }

  // --- Ledger ------------------------------------------------------------
  listLedger(userId: string) {
    return this.many<PointsLedgerEntry>(
      this.sb
        .from("points_ledger")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    );
  }
  async adjustPoints(input: {
    userId: string;
    points: number;
    xp?: number;
    reason: string;
    actorId: string;
  }) {
    return (await this.one<PointsLedgerEntry>(
      this.sb
        .rpc("adjust_points", {
          p_user_id: input.userId,
          p_points: input.points,
          p_xp: input.xp ?? 0,
          p_reason: input.reason,
        })
        .single(),
    ))!;
  }

  // --- Rewards -----------------------------------------------------------
  listRewards(filter: { partnerId?: string; status?: EntityStatus } = {}) {
    let q = this.sb.from("rewards").select("*");
    if (filter.partnerId) q = q.eq("partner_id", filter.partnerId);
    if (filter.status) q = q.eq("status", filter.status);
    return this.many<Reward>(q);
  }
  getReward(id: string) {
    return this.one<Reward>(this.sb.from("rewards").select("*").eq("id", id).maybeSingle());
  }
  async upsertReward(input: Partial<Reward> & { partner_id: string; title: string }) {
    return (await this.one<Reward>(this.sb.from("rewards").upsert(input).select().single()))!;
  }
  async redeemReward(input: RedeemRewardInput): Promise<RedeemRewardResult> {
    const { data, error } = await this.sb.rpc("redeem_reward", {
      p_reward_id: input.rewardId,
    });
    if (error) throw error;
    return data as RedeemRewardResult;
  }
  listRedemptions(filter: { userId?: string; partnerId?: string }) {
    let q = this.sb
      .from("reward_redemptions")
      .select("*")
      .order("redeemed_at", { ascending: false });
    if (filter.userId) q = q.eq("user_id", filter.userId);
    if (filter.partnerId) q = q.eq("partner_id", filter.partnerId);
    return this.many<RewardRedemption>(q);
  }

  // --- Community notes ---------------------------------------------------
  listNotesByQuest(questId: string) {
    return this.many<CommunityNoteWithAuthor>(
      this.sb
        .from("community_notes_with_author")
        .select("*")
        .eq("quest_id", questId)
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false }),
    );
  }
  async createNote(input: CreateNoteInput): Promise<CreateNoteResult> {
    const { data, error } = await this.sb.rpc("create_community_note", {
      p_quest_id: input.questId,
      p_content: input.content,
      p_image_url: input.imageUrl ?? null,
    });
    if (error) throw error;
    return data as CreateNoteResult;
  }
  listNotesForModeration(status?: ModerationStatus) {
    let q = this.sb
      .from("community_notes_with_author")
      .select("*")
      .order("created_at", { ascending: false });
    if (status) q = q.eq("moderation_status", status);
    return this.many<CommunityNoteWithAuthor>(q);
  }
  async setNoteModeration(noteId: string, status: ModerationStatus) {
    const { error } = await this.sb
      .from("community_notes")
      .update({ moderation_status: status })
      .eq("id", noteId);
    if (error) throw error;
  }

  // --- Leaderboards ------------------------------------------------------
  async getLeaderboard(input: {
    scope: LeaderboardScope;
    scopeId?: string | null;
    period: LeaderboardPeriod;
    selfUserId?: string | null;
    limit?: number;
  }): Promise<LeaderboardRow[]> {
    const { data, error } = await this.sb.rpc("get_leaderboard", {
      p_scope: input.scope,
      p_scope_id: input.scopeId ?? null,
      p_period: input.period,
      p_limit: input.limit ?? 100,
    });
    if (error) throw error;
    return (data as LeaderboardRow[]).map((r) => ({
      ...r,
      is_self: r.user_id === input.selfUserId,
    }));
  }

  // --- Analytics ---------------------------------------------------------
  async getPartnerAnalytics(partnerId: string): Promise<AnalyticsSummary> {
    const { data, error } = await this.sb.rpc("partner_analytics", {
      p_partner_id: partnerId,
    });
    if (error) throw error;
    return data as AnalyticsSummary;
  }
  async getPlatformAnalytics(): Promise<AnalyticsSummary> {
    const { data, error } = await this.sb.rpc("platform_analytics");
    if (error) throw error;
    return data as AnalyticsSummary;
  }

  // --- Audit -------------------------------------------------------------
  listAudit(limit = 100) {
    return this.many<AuditLog>(
      this.sb
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit),
    );
  }
  async addAudit(input: {
    actorId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    return (await this.one<AuditLog>(
      this.sb
        .from("audit_logs")
        .insert({
          actor_id: input.actorId,
          action: input.action,
          entity_type: input.entityType,
          entity_id: input.entityId ?? null,
          metadata: input.metadata ?? null,
        })
        .select()
        .single(),
    ))!;
  }
}
