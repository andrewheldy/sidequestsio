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
  | "scan_failed"
  | "quest_not_found"
  | "quest_inactive"
  | "quest_expired";

export interface ScanResolution {
  ok: boolean;
  error?: ScanError;
  quest?: QuestWithContext;
  scan?: ScanEvent;
  /** How the code was scanned, for venue codes: printed QR or NFC tag. */
  codeKind?: "qr" | "nfc";
}

function questLifecycleError(quest: QuestWithContext): ScanError | null {
  if (quest.status !== "active") return "quest_inactive";
  const now = new Date().toISOString();
  if (quest.start_date && now < quest.start_date) return "quest_inactive";
  if (quest.end_date && now > quest.end_date) return "quest_expired";
  return null;
}

/**
 * Resolve a scanned venue code (used by /scan/:code, which printed QR codes
 * and NFC tags both open). The code is checked server-side and the resulting
 * scan is what lets the user complete a QR/NFC quest.
 */
export async function resolveByCode(
  code: string,
  userId: string | null,
): Promise<ScanResolution> {
  const repo = await getRepository();
  let res;
  try {
    res = await repo.recordCodeScan({ code, userId, anonymousSessionId: getAnonymousSessionId() });
  } catch {
    return { ok: false, error: "scan_failed" };
  }
  if (!res.ok || !res.questId) return { ok: false, error: "invalid_qr" };

  const quest = await repo.getQuest(res.questId);
  if (!quest) return { ok: false, error: "quest_not_found" };

  track("qr_scanned", {
    quest_id: quest.id,
    qr_code_id: res.scan?.qr_code_id ?? null,
    partner_id: quest.partner_id,
    venue_id: quest.venue_id,
    user_id: userId,
    props: { code_kind: res.codeKind ?? "qr" },
  });

  const lifecycle = questLifecycleError(quest);
  if (lifecycle) return { ok: false, error: lifecycle, quest, scan: res.scan, codeKind: res.codeKind };
  return { ok: true, quest, scan: res.scan, codeKind: res.codeKind };
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
    title: "Code not recognized",
    body: "This QR code or NFC tag doesn't match an active quest. Double-check the sticker and try again.",
  },
  scan_failed: {
    title: "Scan didn't go through",
    body: "We couldn't record that scan. Check your connection, then scan the code or tap the tag again.",
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
