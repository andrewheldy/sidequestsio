/**
 * Scan-flow service (Phase 6).
 *
 * Resolves QR codes and direct quest links into a recorded ScanEvent, emitting
 * the appropriate analytics events and surfacing typed errors for invalid /
 * inactive / expired quests. UI components stay thin and just render the result.
 */

import { getRepository } from "@/lib/db";
import { getAnonymousSessionId } from "@/lib/app/session";
import { track } from "@/lib/analytics/events";
import type { QuestWithContext, ScanEvent } from "@/types/db";

export type ScanError =
  | "invalid_qr"
  | "quest_not_found"
  | "quest_inactive"
  | "quest_expired";

export interface ScanResolution {
  ok: boolean;
  error?: ScanError;
  quest?: QuestWithContext;
  scan?: ScanEvent;
}

function questLifecycleError(quest: QuestWithContext): ScanError | null {
  if (quest.status !== "active") return "quest_inactive";
  const now = new Date().toISOString();
  if (quest.start_date && now < quest.start_date) return "quest_inactive";
  if (quest.end_date && now > quest.end_date) return "quest_expired";
  return null;
}

/** Resolve a public QR code string (used by /scan/:code). */
export async function resolveByCode(
  code: string,
  userId: string | null,
): Promise<ScanResolution> {
  const repo = await getRepository();
  const qr = await repo.getQrByCode(code);
  if (!qr || qr.status !== "active") return { ok: false, error: "invalid_qr" };

  const quest = await repo.getQuest(qr.quest_id);
  if (!quest) return { ok: false, error: "quest_not_found" };

  const scan = await repo.recordScan({
    questId: quest.id,
    qrCodeId: qr.id,
    code,
    userId,
    anonymousSessionId: getAnonymousSessionId(),
  });
  track("qr_scanned", {
    quest_id: quest.id,
    qr_code_id: qr.id,
    partner_id: quest.partner_id,
    venue_id: quest.venue_id,
    user_id: userId,
  });

  const lifecycle = questLifecycleError(quest);
  if (lifecycle) return { ok: false, error: lifecycle, quest, scan };
  return { ok: true, quest, scan };
}

/** Record a scan for a direct quest link (used by /q/:questId and quest detail). */
export async function recordQuestScan(
  questId: string,
  userId: string | null,
): Promise<ScanResolution> {
  const repo = await getRepository();
  const quest = await repo.getQuest(questId);
  if (!quest) return { ok: false, error: "quest_not_found" };

  const scan = await repo.recordScan({
    questId: quest.id,
    userId,
    anonymousSessionId: getAnonymousSessionId(),
  });
  track("quest_viewed", {
    quest_id: quest.id,
    partner_id: quest.partner_id,
    venue_id: quest.venue_id,
    user_id: userId,
  });

  const lifecycle = questLifecycleError(quest);
  if (lifecycle) return { ok: false, error: lifecycle, quest, scan };
  return { ok: true, quest, scan };
}

export const SCAN_ERROR_COPY: Record<ScanError, { title: string; body: string }> = {
  invalid_qr: {
    title: "QR code not recognized",
    body: "This code doesn't match an active quest. Double-check the sticker and try again.",
  },
  quest_not_found: {
    title: "Quest not found",
    body: "We couldn't find this quest. It may have been removed.",
  },
  quest_inactive: {
    title: "Quest not active yet",
    body: "This quest isn't live right now. Check back soon!",
  },
  quest_expired: {
    title: "Quest expired",
    body: "This quest has ended. Explore other nearby quests instead.",
  },
};
