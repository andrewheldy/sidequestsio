/**
 * LocalRepository — a fully functional, in-browser implementation of the
 * Repository contract backed by localStorage. It contains the real MVP business
 * logic (immutable points ledger, duplicate-completion guards, inventory
 * decrements, small-sample analytics suppression) so the entire product works
 * with no backend. The Supabase implementation mirrors this behaviour server-side.
 */

import type {
  AuditLog,
  CommunityNote,
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
import { AnalyticsSummary, SMALL_SAMPLE_THRESHOLD } from "../types";
import { loadDb, mutate, DbSnapshot } from "./store";
import { nanoid, shortCode } from "@/lib/app/id";
import { levelForXp } from "@/lib/app/leveling";
import { detectDevice, getReferrer } from "@/lib/app/device";

const NOTE_MAX = 280;

function nowIso() {
  return new Date().toISOString();
}

export class LocalRepository implements Repository {
  // --- Users -------------------------------------------------------------
  async getUserById(id: string): Promise<User | null> {
    return loadDb().users.find((u) => u.id === id) ?? null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const e = email.toLowerCase();
    return loadDb().users.find((u) => u.email?.toLowerCase() === e) ?? null;
  }

  async upsertUser(input: Partial<User> & { email: string }): Promise<User> {
    return mutate((db) => {
      const existing = db.users.find(
        (u) => u.email?.toLowerCase() === input.email.toLowerCase(),
      );
      if (existing) {
        Object.assign(existing, input, { last_active_at: nowIso() });
        return existing;
      }
      const user: User = {
        id: input.id ?? `user-${nanoid(10)}`,
        email: input.email,
        display_name:
          input.display_name ?? input.email.split("@")[0] ?? "Quester",
        avatar_url: input.avatar_url ?? null,
        role: input.role ?? "user",
        created_at: nowIso(),
        last_active_at: nowIso(),
        account_status: "active",
      };
      db.users.push(user);
      db.profiles.push({
        user_id: user.id,
        home_city: null,
        xp: 0,
        level: 1,
        points_balance_cache: 0,
        lifetime_points: 0,
        completed_quests_count: 0,
        community_notes_count: 0,
        rewards_redeemed_count: 0,
      });
      db.privacy.push({
        user_id: user.id,
        analytics_consent: true,
        marketing_consent: false,
        location_consent: false,
        leaderboard_visibility: "public",
        profile_visibility: "public",
      });
      return user;
    });
  }

  async updateUser(id: string, patch: Partial<User>): Promise<User> {
    return mutate((db) => {
      const u = db.users.find((x) => x.id === id);
      if (!u) throw new Error("user_not_found");
      Object.assign(u, patch);
      return u;
    });
  }

  async listUsers(): Promise<User[]> {
    return [...loadDb().users].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
  }

  // --- Profiles ----------------------------------------------------------
  async getProfile(userId: string): Promise<UserProfile | null> {
    return loadDb().profiles.find((p) => p.user_id === userId) ?? null;
  }

  async updateProfile(
    userId: string,
    patch: Partial<UserProfile>,
  ): Promise<UserProfile> {
    return mutate((db) => {
      const p = db.profiles.find((x) => x.user_id === userId);
      if (!p) throw new Error("profile_not_found");
      Object.assign(p, patch);
      return p;
    });
  }

  // --- Privacy & consent -------------------------------------------------
  async getPrivacy(userId: string): Promise<PrivacyPreferences> {
    const db = loadDb();
    let p = db.privacy.find((x) => x.user_id === userId);
    if (!p) {
      p = {
        user_id: userId,
        analytics_consent: true,
        marketing_consent: false,
        location_consent: false,
        leaderboard_visibility: "public",
        profile_visibility: "public",
      };
    }
    return p;
  }

  async updatePrivacy(
    userId: string,
    patch: Partial<PrivacyPreferences>,
  ): Promise<PrivacyPreferences> {
    return mutate((db) => {
      let p = db.privacy.find((x) => x.user_id === userId);
      if (!p) {
        p = {
          user_id: userId,
          analytics_consent: true,
          marketing_consent: false,
          location_consent: false,
          leaderboard_visibility: "public",
          profile_visibility: "public",
        };
        db.privacy.push(p);
      }
      Object.assign(p, patch);
      return p;
    });
  }

  async recordConsent(input: {
    userId: string;
    consentType: ConsentType;
    granted: boolean;
    source: string;
  }): Promise<ConsentEvent> {
    return mutate((db) => {
      const ev: ConsentEvent = {
        id: `consent-${nanoid(10)}`,
        user_id: input.userId,
        consent_type: input.consentType,
        granted: input.granted,
        timestamp: nowIso(),
        source: input.source,
      };
      db.consents.push(ev);
      return ev;
    });
  }

  // --- Partners & venues -------------------------------------------------
  async listPartners(): Promise<Partner[]> {
    return [...loadDb().partners];
  }

  async getPartner(id: string): Promise<Partner | null> {
    return loadDb().partners.find((p) => p.id === id) ?? null;
  }

  async getPartnerByOwner(userId: string): Promise<Partner | null> {
    return loadDb().partners.find((p) => p.owner_user_id === userId) ?? null;
  }

  async upsertPartner(
    input: Partial<Partner> & { name: string },
  ): Promise<Partner> {
    return mutate((db) => {
      if (input.id) {
        const p = db.partners.find((x) => x.id === input.id);
        if (p) {
          Object.assign(p, input);
          return p;
        }
      }
      const partner: Partner = {
        id: input.id ?? `partner-${nanoid(8)}`,
        name: input.name,
        type: input.type ?? "other",
        contact_email: input.contact_email ?? "",
        status: input.status ?? "pending",
        owner_user_id: input.owner_user_id ?? null,
        created_at: nowIso(),
      };
      db.partners.push(partner);
      return partner;
    });
  }

  async listVenues(partnerId?: string): Promise<Venue[]> {
    const v = loadDb().venues;
    return partnerId ? v.filter((x) => x.partner_id === partnerId) : [...v];
  }

  async getVenue(id: string): Promise<Venue | null> {
    return loadDb().venues.find((v) => v.id === id) ?? null;
  }

  async upsertVenue(
    input: Partial<Venue> & { partner_id: string; name: string },
  ): Promise<Venue> {
    return mutate((db) => {
      if (input.id) {
        const v = db.venues.find((x) => x.id === input.id);
        if (v) {
          Object.assign(v, input);
          return v;
        }
      }
      const venue: Venue = {
        id: input.id ?? `venue-${nanoid(8)}`,
        partner_id: input.partner_id,
        name: input.name,
        address: input.address ?? null,
        city: input.city ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        status: input.status ?? "active",
      };
      db.venues.push(venue);
      return venue;
    });
  }

  // --- Quests ------------------------------------------------------------
  private decorateQuest(db: DbSnapshot, q: Quest): QuestWithContext {
    return {
      ...q,
      partner: db.partners.find((p) => p.id === q.partner_id),
      venue: q.venue_id
        ? db.venues.find((v) => v.id === q.venue_id)
        : undefined,
    };
  }

  async listQuests(filter: QuestFilter = {}): Promise<QuestWithContext[]> {
    const db = loadDb();
    return db.quests
      .filter((q) => (filter.status ? q.status === filter.status : true))
      .filter((q) => (filter.category ? q.category === filter.category : true))
      .filter((q) => (filter.partnerId ? q.partner_id === filter.partnerId : true))
      .filter((q) => {
        if (!filter.city) return true;
        const v = q.venue_id ? db.venues.find((x) => x.id === q.venue_id) : null;
        return v?.city === filter.city;
      })
      .map((q) => this.decorateQuest(db, q));
  }

  async getQuest(id: string): Promise<QuestWithContext | null> {
    const db = loadDb();
    const q = db.quests.find((x) => x.id === id);
    return q ? this.decorateQuest(db, q) : null;
  }

  async upsertQuest(
    input: Partial<Quest> & { partner_id: string; title: string },
  ): Promise<Quest> {
    return mutate((db) => {
      if (input.id) {
        const q = db.quests.find((x) => x.id === input.id);
        if (q) {
          Object.assign(q, input);
          return q;
        }
      }
      const quest: Quest = {
        id: input.id ?? `quest-${nanoid(8)}`,
        partner_id: input.partner_id,
        venue_id: input.venue_id ?? null,
        title: input.title,
        description: input.description ?? "",
        category: input.category ?? "hidden_gem",
        difficulty: input.difficulty ?? "easy",
        xp_reward: input.xp_reward ?? 50,
        points_reward: input.points_reward ?? 100,
        status: input.status ?? "draft",
        start_date: input.start_date ?? null,
        end_date: input.end_date ?? null,
        verification_type: input.verification_type ?? "qr",
        verification_secret: input.verification_secret ?? null,
        image_url: input.image_url ?? null,
        created_at: nowIso(),
      };
      db.quests.push(quest);
      return quest;
    });
  }

  // --- QR codes ----------------------------------------------------------
  async getQrByCode(code: string): Promise<QrCode | null> {
    return (
      loadDb().qrCodes.find(
        (q) => q.code.toLowerCase() === code.toLowerCase(),
      ) ?? null
    );
  }

  async listQrCodes(partnerId?: string): Promise<QrCode[]> {
    const c = loadDb().qrCodes;
    return partnerId ? c.filter((x) => x.partner_id === partnerId) : [...c];
  }

  async createQrCode(input: {
    questId: string;
    partnerId: string;
    venueId?: string | null;
  }): Promise<QrCode> {
    return mutate((db) => {
      const qr: QrCode = {
        id: `qr-${nanoid(8)}`,
        quest_id: input.questId,
        venue_id: input.venueId ?? null,
        partner_id: input.partnerId,
        code: shortCode(2, 4).replace("-", ""),
        destination_url: `/q/${input.questId}`,
        status: "active",
        created_at: nowIso(),
      };
      db.qrCodes.push(qr);
      return qr;
    });
  }

  // --- Scans -------------------------------------------------------------
  async recordScan(input: RecordScanInput): Promise<ScanEvent> {
    const device = detectDevice();
    return mutate((db) => {
      const quest = db.quests.find((q) => q.id === input.questId);
      const scan: ScanEvent = {
        id: `scan-${nanoid(12)}`,
        qr_code_id: input.qrCodeId ?? null,
        quest_id: input.questId,
        venue_id: quest?.venue_id ?? null,
        partner_id: quest?.partner_id ?? "",
        user_id: input.userId ?? null,
        anonymous_session_id: input.anonymousSessionId,
        timestamp: nowIso(),
        device_type: device.device_type,
        browser: device.browser,
        operating_system: device.operating_system,
        referrer: getReferrer(),
        approximate_location: null, // only set when location consent granted
        location_permission_granted: false,
        conversion_state: "scanned",
      };
      db.scans.push(scan);
      return scan;
    });
  }

  async markScanConverted(
    scanId: string,
    state: ScanEvent["conversion_state"],
  ): Promise<void> {
    mutate((db) => {
      const s = db.scans.find((x) => x.id === scanId);
      if (s) s.conversion_state = state;
    });
  }

  async listScans(
    filter: { partnerId?: string; questId?: string; limit?: number } = {},
  ): Promise<ScanEvent[]> {
    let scans = [...loadDb().scans];
    if (filter.partnerId)
      scans = scans.filter((s) => s.partner_id === filter.partnerId);
    if (filter.questId)
      scans = scans.filter((s) => s.quest_id === filter.questId);
    scans.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return filter.limit ? scans.slice(0, filter.limit) : scans;
  }

  // --- Attempts & completion --------------------------------------------
  async startQuest(userId: string, questId: string): Promise<QuestAttempt> {
    return mutate((db) => {
      const existing = db.attempts.find(
        (a) =>
          a.user_id === userId &&
          a.quest_id === questId &&
          a.status === "in_progress",
      );
      if (existing) return existing;
      const attempt: QuestAttempt = {
        id: `attempt-${nanoid(10)}`,
        user_id: userId,
        quest_id: questId,
        started_at: nowIso(),
        completed_at: null,
        status: "in_progress",
        verification_method: null,
        failure_reason: null,
      };
      db.attempts.push(attempt);
      return attempt;
    });
  }

  async hasCompleted(userId: string, questId: string): Promise<boolean> {
    return loadDb().completions.some(
      (c) => c.user_id === userId && c.quest_id === questId,
    );
  }

  async completeQuest(input: CompleteQuestInput): Promise<CompleteQuestResult> {
    return mutate((db) => {
      const quest = db.quests.find((q) => q.id === input.questId);
      if (!quest) return { ok: false, error: "not_found" as const };

      // Already completed? Prevent duplicate awards / reward farming.
      if (
        db.completions.some(
          (c) => c.user_id === input.userId && c.quest_id === input.questId,
        )
      ) {
        return { ok: false, error: "already_completed" as const };
      }

      // Quest lifecycle checks.
      if (quest.status !== "active") {
        return { ok: false, error: "quest_inactive" as const };
      }
      const today = nowIso();
      if (quest.start_date && today < quest.start_date)
        return { ok: false, error: "quest_inactive" as const };
      if (quest.end_date && today > quest.end_date)
        return { ok: false, error: "quest_expired" as const };

      // Verification.
      const verified = verify(quest, input);
      if (!verified) {
        // Record the failed attempt for auditing / anti-abuse.
        const attempt = db.attempts.find(
          (a) =>
            a.user_id === input.userId &&
            a.quest_id === input.questId &&
            a.status === "in_progress",
        );
        if (attempt) {
          attempt.status = "failed";
          attempt.failure_reason = "verification_failed";
          attempt.verification_method = input.verificationMethod;
        }
        return { ok: false, error: "verification_failed" as const };
      }

      // Award.
      const completedAt = nowIso();
      const completion: QuestCompletion = {
        id: `completion-${nanoid(10)}`,
        user_id: input.userId,
        quest_id: quest.id,
        venue_id: quest.venue_id,
        partner_id: quest.partner_id,
        completed_at: completedAt,
        xp_awarded: quest.xp_reward,
        points_awarded: quest.points_reward,
        source_scan_id: input.sourceScanId ?? null,
      };
      db.completions.push(completion);

      // Immutable ledger entry (source of truth for points & xp).
      const ledger: PointsLedgerEntry = {
        id: `ledger-${nanoid(10)}`,
        user_id: input.userId,
        transaction_type: "earn",
        source: "quest_completion",
        points_amount: quest.points_reward,
        xp_amount: quest.xp_reward,
        quest_id: quest.id,
        reward_id: null,
        partner_id: quest.partner_id,
        metadata: { verification: input.verificationMethod },
        created_at: completedAt,
      };
      db.ledger.push(ledger);

      // Close the attempt.
      const attempt = db.attempts.find(
        (a) =>
          a.user_id === input.userId &&
          a.quest_id === input.questId &&
          a.status === "in_progress",
      );
      if (attempt) {
        attempt.status = "completed";
        attempt.completed_at = completedAt;
        attempt.verification_method = input.verificationMethod;
      }

      // Mark originating scan as converted.
      if (input.sourceScanId) {
        const s = db.scans.find((x) => x.id === input.sourceScanId);
        if (s) s.conversion_state = "completed";
      }

      // Update cached profile aggregates + level.
      const profile = db.profiles.find((p) => p.user_id === input.userId);
      let newLevel = 1;
      let leveledUp = false;
      if (profile) {
        const prevLevel = profile.level;
        profile.xp += quest.xp_reward;
        profile.points_balance_cache += quest.points_reward;
        profile.lifetime_points += quest.points_reward;
        profile.completed_quests_count += 1;
        profile.level = levelForXp(profile.xp);
        newLevel = profile.level;
        leveledUp = profile.level > prevLevel;
      }

      db.audit.push(auditEntry(input.userId, "quest.completed", "quest", quest.id));

      return {
        ok: true,
        completion,
        xpAwarded: quest.xp_reward,
        pointsAwarded: quest.points_reward,
        newLevel,
        leveledUp,
      };
    });
  }

  async listCompletions(userId: string): Promise<QuestCompletion[]> {
    return loadDb()
      .completions.filter((c) => c.user_id === userId)
      .sort((a, b) => b.completed_at.localeCompare(a.completed_at));
  }

  // --- Ledger ------------------------------------------------------------
  async listLedger(userId: string): Promise<PointsLedgerEntry[]> {
    return loadDb()
      .ledger.filter((l) => l.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async adjustPoints(input: {
    userId: string;
    points: number;
    xp?: number;
    reason: string;
    actorId: string;
  }): Promise<PointsLedgerEntry> {
    return mutate((db) => {
      const entry: PointsLedgerEntry = {
        id: `ledger-${nanoid(10)}`,
        user_id: input.userId,
        transaction_type: "adjust",
        source: "admin_adjustment",
        points_amount: input.points,
        xp_amount: input.xp ?? 0,
        quest_id: null,
        reward_id: null,
        partner_id: null,
        metadata: { reason: input.reason },
        created_at: nowIso(),
      };
      db.ledger.push(entry);
      const profile = db.profiles.find((p) => p.user_id === input.userId);
      if (profile) {
        profile.points_balance_cache += input.points;
        if (input.points > 0) profile.lifetime_points += input.points;
        if (input.xp) {
          profile.xp += input.xp;
          profile.level = levelForXp(profile.xp);
        }
      }
      db.audit.push(
        auditEntry(input.actorId, "points.adjusted", "user", input.userId, {
          points: input.points,
          reason: input.reason,
        }),
      );
      return entry;
    });
  }

  // --- Rewards -----------------------------------------------------------
  async listRewards(
    filter: { partnerId?: string; status?: EntityStatus } = {},
  ): Promise<Reward[]> {
    return loadDb()
      .rewards.filter((r) => (filter.partnerId ? r.partner_id === filter.partnerId : true))
      .filter((r) => (filter.status ? r.status === filter.status : true));
  }

  async getReward(id: string): Promise<Reward | null> {
    return loadDb().rewards.find((r) => r.id === id) ?? null;
  }

  async upsertReward(
    input: Partial<Reward> & { partner_id: string; title: string },
  ): Promise<Reward> {
    return mutate((db) => {
      if (input.id) {
        const r = db.rewards.find((x) => x.id === input.id);
        if (r) {
          Object.assign(r, input);
          return r;
        }
      }
      const reward: Reward = {
        id: input.id ?? `reward-${nanoid(8)}`,
        partner_id: input.partner_id,
        title: input.title,
        description: input.description ?? "",
        points_cost: input.points_cost ?? 500,
        inventory: input.inventory ?? null,
        status: input.status ?? "active",
        expiration_date: input.expiration_date ?? null,
        image_url: input.image_url ?? null,
      };
      db.rewards.push(reward);
      return reward;
    });
  }

  async redeemReward(input: RedeemRewardInput): Promise<RedeemRewardResult> {
    return mutate((db) => {
      const reward = db.rewards.find((r) => r.id === input.rewardId);
      if (!reward) return { ok: false, error: "not_found" as const };
      if (reward.status !== "active")
        return { ok: false, error: "inactive" as const };
      if (reward.expiration_date && nowIso() > reward.expiration_date)
        return { ok: false, error: "expired" as const };
      if (reward.inventory !== null && reward.inventory <= 0)
        return { ok: false, error: "out_of_stock" as const };

      const profile = db.profiles.find((p) => p.user_id === input.userId);
      if (!profile || profile.points_balance_cache < reward.points_cost)
        return { ok: false, error: "insufficient_points" as const };

      const at = nowIso();
      const redemption: RewardRedemption = {
        id: `redemption-${nanoid(10)}`,
        user_id: input.userId,
        reward_id: reward.id,
        partner_id: reward.partner_id,
        points_spent: reward.points_cost,
        redemption_code: shortCode(2, 4),
        status: "issued",
        redeemed_at: at,
      };
      db.redemptions.push(redemption);

      // Immutable spend ledger entry.
      db.ledger.push({
        id: `ledger-${nanoid(10)}`,
        user_id: input.userId,
        transaction_type: "spend",
        source: "reward_redemption",
        points_amount: -reward.points_cost,
        xp_amount: 0,
        quest_id: null,
        reward_id: reward.id,
        partner_id: reward.partner_id,
        metadata: { redemption_id: redemption.id },
        created_at: at,
      });

      // Decrement inventory + update cache.
      if (reward.inventory !== null) reward.inventory -= 1;
      profile.points_balance_cache -= reward.points_cost;
      profile.rewards_redeemed_count += 1;

      db.audit.push(
        auditEntry(input.userId, "reward.redeemed", "reward", reward.id),
      );

      return { ok: true, redemption };
    });
  }

  async listRedemptions(filter: {
    userId?: string;
    partnerId?: string;
  }): Promise<RewardRedemption[]> {
    return loadDb()
      .redemptions.filter((r) => (filter.userId ? r.user_id === filter.userId : true))
      .filter((r) => (filter.partnerId ? r.partner_id === filter.partnerId : true))
      .sort((a, b) => b.redeemed_at.localeCompare(a.redeemed_at));
  }

  // --- Community notes ---------------------------------------------------
  private decorateNote(db: DbSnapshot, n: CommunityNote): CommunityNoteWithAuthor {
    const author = db.users.find((u) => u.id === n.user_id);
    return {
      ...n,
      author_display_name: author?.display_name ?? "Quester",
      author_avatar_url: author?.avatar_url ?? null,
    };
  }

  async listNotesByQuest(questId: string): Promise<CommunityNoteWithAuthor[]> {
    const db = loadDb();
    return db.notes
      .filter((n) => n.quest_id === questId && n.moderation_status === "approved")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((n) => this.decorateNote(db, n));
  }

  async createNote(input: CreateNoteInput): Promise<CreateNoteResult> {
    const content = input.content.trim();
    if (!content) return { ok: false, error: "empty" };
    if (content.length > NOTE_MAX) return { ok: false, error: "too_long" };

    return mutate((db) => {
      // Only users who completed the quest may leave a note.
      const completed = db.completions.some(
        (c) => c.user_id === input.userId && c.quest_id === input.questId,
      );
      if (!completed) return { ok: false, error: "not_completed" as const };

      const quest = db.quests.find((q) => q.id === input.questId);
      if (!quest) return { ok: false, error: "not_found" as const };

      const note: CommunityNote = {
        id: `note-${nanoid(10)}`,
        user_id: input.userId,
        quest_id: input.questId,
        venue_id: quest.venue_id,
        content,
        image_url: input.imageUrl ?? null,
        moderation_status: "approved", // MVP: auto-approve; admin can moderate
        created_at: nowIso(),
      };
      db.notes.push(note);

      const profile = db.profiles.find((p) => p.user_id === input.userId);
      if (profile) profile.community_notes_count += 1;

      return { ok: true, note };
    });
  }

  async listNotesForModeration(
    status?: ModerationStatus,
  ): Promise<CommunityNoteWithAuthor[]> {
    const db = loadDb();
    return db.notes
      .filter((n) => (status ? n.moderation_status === status : true))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((n) => this.decorateNote(db, n));
  }

  async setNoteModeration(
    noteId: string,
    status: ModerationStatus,
  ): Promise<void> {
    mutate((db) => {
      const n = db.notes.find((x) => x.id === noteId);
      if (n) n.moderation_status = status;
    });
  }

  // --- Leaderboards ------------------------------------------------------
  async getLeaderboard(input: {
    scope: LeaderboardScope;
    scopeId?: string | null;
    period: LeaderboardPeriod;
    selfUserId?: string | null;
    limit?: number;
  }): Promise<LeaderboardRow[]> {
    const db = loadDb();
    const since = periodStart(input.period);

    // Sum XP earned in-period per user from the ledger, scoped appropriately.
    const scores = new Map<string, number>();
    for (const entry of db.ledger) {
      if (entry.xp_amount <= 0) continue;
      if (since && entry.created_at < since) continue;
      if (!inScope(db, entry, input.scope, input.scopeId)) continue;
      scores.set(entry.user_id, (scores.get(entry.user_id) ?? 0) + entry.xp_amount);
    }

    // Seed with lifetime profile XP for all-time global so the board isn't empty.
    if (input.scope === "global" && input.period === "all_time") {
      for (const p of db.profiles) {
        if (!scores.has(p.user_id)) scores.set(p.user_id, p.xp);
      }
    }

    const rows = [...scores.entries()]
      .map(([userId, score]) => {
        const user = db.users.find((u) => u.id === userId);
        const privacy = db.privacy.find((x) => x.user_id === userId);
        return { user, privacy, score, userId };
      })
      // Respect leaderboard opt-out (the user can still see themselves).
      .filter(
        (r) =>
          r.privacy?.leaderboard_visibility !== "private" ||
          r.userId === input.selfUserId,
      )
      .filter((r) => r.user && r.user.role === "user")
      .sort((a, b) => b.score - a.score);

    const limited = input.limit ? rows.slice(0, input.limit) : rows;
    return limited.map((r, i) => ({
      rank: i + 1,
      user_id: r.userId,
      display_name: r.user?.display_name ?? "Quester",
      avatar_url: r.user?.avatar_url ?? null,
      score: r.score,
      is_self: r.userId === input.selfUserId,
    }));
  }

  // --- Analytics ---------------------------------------------------------
  async getPartnerAnalytics(partnerId: string): Promise<AnalyticsSummary> {
    return this.computeAnalytics((s) => s.partner_id === partnerId, partnerId);
  }

  async getPlatformAnalytics(): Promise<AnalyticsSummary> {
    return this.computeAnalytics(() => true, null);
  }

  private computeAnalytics(
    scanPredicate: (s: ScanEvent) => boolean,
    partnerId: string | null,
  ): AnalyticsSummary {
    const db = loadDb();
    const scans = db.scans.filter(scanPredicate);
    const completions = db.completions.filter((c) =>
      partnerId ? c.partner_id === partnerId : true,
    );
    const redemptions = db.redemptions.filter((r) =>
      partnerId ? r.partner_id === partnerId : true,
    );
    const notes = db.notes.filter((n) => {
      if (!partnerId) return true;
      const quest = db.quests.find((q) => q.id === n.quest_id);
      return quest?.partner_id === partnerId;
    });

    const totalScans = scans.length;
    const suppressed = totalScans > 0 && totalScans < SMALL_SAMPLE_THRESHOLD;

    const uniqueVisitors = new Set(
      scans.map((s) => s.user_id ?? s.anonymous_session_id),
    ).size;
    const authenticatedVisitors = new Set(
      scans.filter((s) => s.user_id).map((s) => s.user_id),
    ).size;

    // Scans by day.
    const byDay = new Map<string, number>();
    for (const s of scans) {
      const day = s.timestamp.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }

    // Scans by quest / venue.
    const byQuest = new Map<string, number>();
    const byVenue = new Map<string, number>();
    for (const s of scans) {
      byQuest.set(s.quest_id, (byQuest.get(s.quest_id) ?? 0) + 1);
      if (s.venue_id) byVenue.set(s.venue_id, (byVenue.get(s.venue_id) ?? 0) + 1);
    }

    return {
      totalScans,
      uniqueVisitors,
      authenticatedVisitors,
      completions: completions.length,
      conversionRate: totalScans > 0 ? completions.length / totalScans : 0,
      rewardsRedeemed: redemptions.length,
      communityNotes: notes.length,
      scansByDay: [...byDay.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, value]) => ({ date, value })),
      scansByQuest: suppressed
        ? []
        : [...byQuest.entries()].map(([id, value]) => ({
            id,
            label: db.quests.find((q) => q.id === id)?.title ?? id,
            value,
          })),
      scansByVenue: suppressed
        ? []
        : [...byVenue.entries()].map(([id, value]) => ({
            id,
            label: db.venues.find((v) => v.id === id)?.name ?? id,
            value,
          })),
      suppressed,
    };
  }

  // --- Audit -------------------------------------------------------------
  async listAudit(limit = 100): Promise<AuditLog[]> {
    return [...loadDb().audit]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  async addAudit(input: {
    actorId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<AuditLog> {
    return mutate((db) => {
      const entry = auditEntry(
        input.actorId,
        input.action,
        input.entityType,
        input.entityId ?? null,
        input.metadata,
      );
      db.audit.push(entry);
      return entry;
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function verify(quest: Quest, input: CompleteQuestInput): boolean {
  switch (quest.verification_type) {
    case "venue_code":
      return (
        !!input.venueCode &&
        !!quest.verification_secret &&
        input.venueCode.trim().toUpperCase() ===
          quest.verification_secret.toUpperCase()
      );
    // QR / NFC / GPS / staff: in the MVP the act of reaching the verified
    // completion call (post-scan, with location consent for GPS) is sufficient.
    // Production tightens these with signed tokens / geofence checks server-side.
    case "qr":
    case "nfc":
    case "gps":
    case "staff_approval":
    default:
      return true;
  }
}

function periodStart(period: LeaderboardPeriod): string | null {
  if (period === "all_time") return null;
  const d = new Date();
  if (period === "weekly") d.setDate(d.getDate() - 7);
  if (period === "monthly") d.setMonth(d.getMonth() - 1);
  return d.toISOString();
}

function inScope(
  db: DbSnapshot,
  entry: PointsLedgerEntry,
  scope: LeaderboardScope,
  scopeId?: string | null,
): boolean {
  if (scope === "global") return true;
  if (scope === "campaign") return entry.partner_id === scopeId;
  const quest = entry.quest_id
    ? db.quests.find((q) => q.id === entry.quest_id)
    : null;
  if (scope === "venue") return quest?.venue_id === scopeId;
  if (scope === "city") {
    const venue = quest?.venue_id
      ? db.venues.find((v) => v.id === quest.venue_id)
      : null;
    return venue?.city === scopeId;
  }
  return true;
}

function auditEntry(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata?: Record<string, unknown>,
): AuditLog {
  return {
    id: `audit-${nanoid(10)}`,
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: metadata ?? null,
    created_at: nowIso(),
  };
}
