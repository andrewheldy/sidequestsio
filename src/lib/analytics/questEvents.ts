/**
 * Quest page analytics.
 * --------------------------------------------------------------------------
 * Thin layer over `track()` so every quest page event carries the same
 * attribution (quest, venue, partner, campaign/activation) and action identity
 * without each component assembling payloads by hand. Components call
 * `trackQuestEvent` / `trackQuestEventOnce`; nothing here talks to a vendor.
 *
 * Payload rules:
 *  - ids only come from data (quest/venue/partner ids, action ids); campaign
 *    and activation ids stay null until columns exist for them;
 *  - outbound links report the destination *domain*, never the full URL;
 *  - no user location, only the venue the quest already belongs to.
 */

import type { AppEventName } from "@/types/events";
import type { QuestActionDefinition, QuestPageModel } from "@/lib/quests/questPage";
import { hostOf } from "@/lib/quests/questPage";
import { track } from "./events";

export interface QuestEventContext {
  questId: string;
  questCategory: string | null;
  venueId: string | null;
  venueName: string | null;
  partnerId: string | null;
  campaignId: string | null;
  activationId: string | null;
  userId: string | null;
  /** New per quest page mount: groups one visit's events and scopes impression de-duping. */
  pageViewId: string;
  /** How the visitor arrived: "qr" | "nfc" | "scan" | "direct" | an in-app surface. */
  source: string;
  utm?: Partial<Record<"utm_source" | "utm_medium" | "utm_campaign", string>>;
}

type Props = Record<string, string | number | boolean | null>;

export interface QuestEventDetail {
  action?: QuestActionDefinition;
  /** 0-based position of the action within its row. */
  position?: number;
  /** Stable CTA id for controls that aren't quest actions ("nav.back", "venue.website"). */
  trackingId?: string;
  props?: Props;
}

export function questEventContext(
  model: QuestPageModel | null,
  base: Pick<QuestEventContext, "questId" | "userId" | "pageViewId" | "source" | "utm">,
): QuestEventContext {
  return {
    ...base,
    questId: model?.questId ?? base.questId,
    questCategory: model?.category ?? null,
    venueId: model?.attribution.venueId ?? null,
    venueName: model?.venue?.name ?? null,
    partnerId: model?.attribution.partnerId ?? null,
    campaignId: model?.attribution.campaignId ?? null,
    activationId: model?.attribution.activationId ?? null,
  };
}

export function trackQuestEvent(
  name: AppEventName,
  ctx: QuestEventContext,
  detail: QuestEventDetail = {},
): void {
  const { action, position, trackingId, props } = detail;
  track(name, {
    user_id: ctx.userId,
    quest_id: ctx.questId,
    venue_id: ctx.venueId,
    partner_id: ctx.partnerId,
    campaign_id: ctx.campaignId,
    activation_id: ctx.activationId,
    action_id: action?.id ?? null,
    action_type: action?.type ?? null,
    tracking_id: trackingId ?? action?.trackingId ?? null,
    props: {
      page_view_id: ctx.pageViewId,
      source: ctx.source,
      quest_category: ctx.questCategory,
      venue_name: ctx.venueName,
      ...(ctx.utm ?? {}),
      ...(action
        ? {
            action_role: action.role,
            action_position: position ?? null,
            verification_type: action.verificationType,
            points_available: action.points,
            xp_available: action.xp,
            destination_domain: hostOf(action.url),
          }
        : {}),
      ...(props ?? {}),
    },
  });
}

// Keys already emitted, scoped by page view id. Bounded so a long session of
// quest browsing can't grow it without limit.
const emitted = new Set<string>();
const MAX_EMITTED = 1000;

/**
 * Emits at most once per `key` within a page view — for impressions and
 * page-level events that React re-renders or effects could otherwise repeat.
 */
export function trackQuestEventOnce(
  key: string,
  name: AppEventName,
  ctx: QuestEventContext,
  detail?: QuestEventDetail,
): void {
  const scoped = `${ctx.pageViewId}:${name}:${key}`;
  if (emitted.has(scoped)) return;
  if (emitted.size >= MAX_EMITTED) emitted.clear();
  emitted.add(scoped);
  trackQuestEvent(name, ctx, detail);
}
