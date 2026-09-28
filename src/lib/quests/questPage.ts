/**
 * Quest page view-model.
 * --------------------------------------------------------------------------
 * Adapts the repository shape (`QuestWithContext`: quest + joined venue +
 * `links` JSONB) into the sections the quest page renders — location hero,
 * intro, required action(s), Explore & Share actions and the venue card — so
 * the components stay presentational and never reach into raw columns.
 *
 * Everything here is derived from existing columns; nothing is venue-specific.
 * Missing data drops a section or falls back, it never breaks the layout.
 *
 * Reward honesty: `points` on an optional (Explore & Share) action is what the
 * quest *advertises* (`links.action_points`). Nothing credits those points yet —
 * there is no verification path for social/review/website actions — so the
 * page only ever tracks clicks for them, never completions.
 */

import type {
  ProofMethod,
  QuestInstance,
  QuestLinks,
  QuestWithContext,
  VerificationType,
} from "@/types/db";
import { categoryMeta } from "@/components/app/quest-detail/questCategory";

// ---------------------------------------------------------------------------
// Action definitions
// ---------------------------------------------------------------------------

/** How the required action is proven at the venue. */
export type RequiredActionType =
  | "photo"
  | "check_in"
  | "qr"
  | "nfc"
  | "staff_phrase"
  | "venue_code"
  | "note";

/** Explore & Share actions — all external links today. */
export type OptionalActionType =
  | "instagram"
  | "tiktok"
  | "x"
  | "google_review"
  | "review"
  | "website"
  | "socials";

export type QuestActionType = RequiredActionType | OptionalActionType;

/** `none` = no verification exists; a click is only ever a click. */
export type ActionVerification = VerificationType | "none";

export type ActionCompletionStatus = "available" | "locked" | "completed";

export interface QuestActionDefinition {
  /** Stable per-quest id: "primary" for the required action, the type otherwise. */
  id: string;
  /** Stable analytics identity, independent of copy (e.g. "quest.optional.instagram"). */
  trackingId: string;
  type: QuestActionType;
  role: "required" | "optional";
  title: string;
  description: string | null;
  /** Short card / CTA label. */
  label: string;
  points: number | null;
  xp: number | null;
  image: string | null;
  /** External destination for optional actions (http/https only). */
  url: string | null;
  verificationType: ActionVerification;
}

// ---------------------------------------------------------------------------
// Page model
// ---------------------------------------------------------------------------

export interface QuestHeroModel {
  /** Location-first: the venue name, falling back to the quest title. */
  title: string;
  /** `title` split for the editorial two-weight treatment ("Frost Museum" / "of Science"). */
  titleLead: string;
  titleTail: string | null;
  imageUrl: string | null;
  city: string | null;
  /** Neighborhood when known, else the city. */
  locationLabel: string | null;
  duration: string | null;
}

export interface VenueCardModel {
  id: string;
  name: string;
  shortName: string;
  description: string | null;
  imageUrl: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  hours: string | null;
  hoursNote: string | null;
  priceRange: string | null;
}

export interface QuestAttribution {
  partnerId: string | null;
  venueId: string | null;
  /** No campaign / activation columns exist yet — always null until they do. */
  campaignId: string | null;
  activationId: string | null;
}

export interface QuestPageModel {
  questId: string;
  questTitle: string;
  category: string;
  categoryLabel: string;
  hero: QuestHeroModel;
  intro: string | null;
  /** One entry today; the page renders them in order when there are more. */
  requiredActions: QuestActionDefinition[];
  optionalActions: QuestActionDefinition[];
  venue: VenueCardModel | null;
  attribution: QuestAttribution;
}

/** Overlays a generated instance so the page renders the user's objective and rewards. */
export function applyInstance(quest: QuestWithContext, instance: QuestInstance): QuestWithContext {
  return {
    ...quest,
    funky_action: instance.objective,
    action_prompt: instance.prompt ?? quest.action_prompt,
    proof_method: instance.proof_method ?? quest.proof_method,
    staff_phrase: instance.staff_phrase ?? quest.staff_phrase,
    social_share_prompt: instance.share_prompt ?? quest.social_share_prompt,
    estimated_time: instance.estimated_time ?? quest.estimated_time,
    xp_reward: instance.xp_reward,
    points_reward: instance.points_reward,
  };
}

export function buildQuestPageModel(quest: QuestWithContext): QuestPageModel {
  const venue = quest.venue ?? null;
  const links = quest.links ?? {};
  const heroTitle = venue?.name?.trim() || quest.title;
  const { lead, tail } = splitDisplayTitle(heroTitle);
  const shortName = venue ? splitDisplayTitle(venue.name).lead : lead;

  return {
    questId: quest.id,
    questTitle: quest.title,
    category: quest.category,
    categoryLabel: `${categoryMeta(quest.category).label} Quest`,
    hero: {
      title: heroTitle,
      titleLead: lead,
      titleTail: tail,
      imageUrl: quest.image_url ?? venue?.image_url ?? null,
      city: venue?.city ?? null,
      locationLabel: venue?.neighborhood ?? venue?.city ?? null,
      duration: formatDuration(quest.estimated_time),
    },
    intro: quest.description?.trim() || null,
    requiredActions: [buildRequiredAction(quest)],
    optionalActions: buildOptionalActions(links, venue?.name ?? null),
    venue: venue
      ? {
          id: venue.id,
          name: venue.name,
          shortName,
          description: venue.description ?? null,
          imageUrl: venue.image_url ?? null,
          logoUrl: venue.logo_url ?? null,
          websiteUrl: safeExternalUrl(links.website_url),
          hours: venue.hours ?? null,
          hoursNote: venue.hours_note ?? null,
          priceRange: venue.price_range ?? null,
        }
      : null,
    attribution: {
      partnerId: quest.partner_id ?? null,
      venueId: quest.venue_id ?? null,
      campaignId: null,
      activationId: null,
    },
  };
}

// ---------------------------------------------------------------------------
// Required action
// ---------------------------------------------------------------------------

function buildRequiredAction(quest: QuestWithContext): QuestActionDefinition {
  const type = requiredActionType(quest.proof_method, quest.verification_type);
  // Authored quests carry a playful objective (funky_action) plus a prompt; the
  // rest fall back to their title, with a hint on how the visit is verified.
  const title = quest.funky_action?.trim() || quest.title;
  const description = quest.funky_action?.trim()
    ? quest.action_prompt?.trim() || REQUIRED_HINT[type]
    : REQUIRED_HINT[type];

  return {
    id: "primary",
    trackingId: "quest.primary.complete",
    type,
    role: "required",
    title,
    description,
    label: "Complete quest",
    points: quest.points_reward ?? null,
    xp: quest.xp_reward ?? null,
    image: null,
    url: null,
    verificationType: quest.verification_type,
  };
}

function requiredActionType(
  proof: ProofMethod | null | undefined,
  verification: VerificationType,
): RequiredActionType {
  switch (proof) {
    case "camera":
    case "photo":
      return "photo";
    case "staff_phrase":
      return "staff_phrase";
    case "breadcrumb":
      return "note";
    case "qr":
      return "qr";
    case "manual":
      return "check_in";
  }
  switch (verification) {
    case "qr":
      return "qr";
    case "nfc":
      return "nfc";
    case "venue_code":
      return "venue_code";
    case "staff_approval":
      return "staff_phrase";
    default:
      return "check_in";
  }
}

const REQUIRED_HINT: Record<RequiredActionType, string> = {
  photo: "Snap a photo as proof when you complete it.",
  check_in: "Complete it at the venue, then check in here.",
  qr: "Scan the SideQuests code at the venue to verify your visit.",
  nfc: "Tap the SideQuests tag at the venue to verify your visit.",
  staff_phrase: "Say the quest phrase to staff to complete it.",
  venue_code: "Ask staff for the venue code to complete it.",
  note: "Leave a Community Note about your visit to complete it.",
};

// ---------------------------------------------------------------------------
// Optional (Explore & Share) actions
// ---------------------------------------------------------------------------

const OPTIONAL_ORDER: OptionalActionType[] = [
  "instagram",
  "tiktok",
  "x",
  "google_review",
  "review",
  "website",
  "socials",
];

const OPTIONAL_LABEL: Record<OptionalActionType, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  google_review: "Google Review",
  review: "Reviews",
  website: "Website",
  socials: "All links",
};

function buildOptionalActions(
  links: QuestLinks,
  venueName: string | null,
): QuestActionDefinition[] {
  const urls: Partial<Record<OptionalActionType, string>> = {};
  const put = (type: OptionalActionType, raw: string | null | undefined) => {
    const url = safeExternalUrl(raw);
    if (url && !urls[type]) urls[type] = url;
  };

  put("instagram", links.instagram_url);
  put("tiktok", links.tiktok_url);
  put("x", links.x_url);

  const reviews = links.reviews_url || links.google_reviews_url;
  const isGoogle =
    links.reviews_source === "google" ||
    (!!links.google_reviews_url && !links.reviews_url) ||
    /(^|\.)google\.|goo\.gl$|g\.page$/.test(hostOf(reviews) ?? "");
  put(isGoogle ? "google_review" : "review", reviews);

  put("website", links.website_url);

  // The canonical import shape carries ONE socials landing page. Show it on its
  // platform's card when it is a profile URL, else as a single "All links" card.
  const socials = safeExternalUrl(links.socials_url);
  if (socials) {
    const platform = platformForUrl(socials);
    put(platform && !urls[platform] ? platform : "socials", socials);
  }

  const points = links.action_points ?? {};
  return OPTIONAL_ORDER.filter((type) => urls[type]).map((type) => ({
    id: type,
    trackingId: `quest.optional.${type}`,
    type,
    role: "optional" as const,
    title: OPTIONAL_LABEL[type],
    description: null,
    label: type === "website" ? websiteLabel(venueName) : OPTIONAL_LABEL[type],
    points: positiveOrNull(points[type]),
    xp: null,
    image: null,
    url: urls[type]!,
    verificationType: "none" as const,
  }));
}

function platformForUrl(url: string): OptionalActionType | null {
  const host = hostOf(url) ?? "";
  if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
  if (/(^|\.)tiktok\.com$/.test(host)) return "tiktok";
  if (/(^|\.)(x|twitter)\.com$/.test(host)) return "x";
  return null;
}

/** "Frost Museum of Science" → "Frost Website"; skips leading articles. */
function websiteLabel(venueName: string | null): string {
  const word = venueName
    ?.split(/\s+/)
    .find((w) => !/^(the|a|an|el|la|los|las)$/i.test(w));
  return word && word.length <= 12 ? `${word} Website` : "Website";
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const TITLE_CONNECTORS = /\s+(?=(?:of|at|on|in|&|and|by|de|del)\s)/i;

/**
 * Splits a place name for the hero's two-weight title: the part before the
 * first connector ("of", "at", "&", …) is the bold lead, the rest the lighter
 * tail. Names without a connector (or where the lead would be one short word)
 * stay whole.
 */
export function splitDisplayTitle(title: string): { lead: string; tail: string | null } {
  const clean = title.trim().replace(/\s+/g, " ");
  const colon = clean.indexOf(":");
  if (colon > 2 && colon < clean.length - 2) {
    return { lead: clean.slice(0, colon).trim(), tail: clean.slice(colon + 1).trim() };
  }
  const match = TITLE_CONNECTORS.exec(clean);
  if (match && match.index >= 6) {
    return { lead: clean.slice(0, match.index), tail: clean.slice(match.index + 1) };
  }
  return { lead: clean, tail: null };
}

/** "45 min" → "~45 min"; ranges and already-approximate values pass through. */
export function formatDuration(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (/^\d+\s*(min|mins|minutes|hr|hrs|hour|hours)\b/i.test(value)) return `~${value}`;
  return value;
}

/** "Friday, Oct 3" for repeatable-quest unlock dates. */
export function formatUnlockDate(iso: string | null | undefined): string {
  if (!iso) return "a later date";
  return new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

/** Only http(s) URLs may become hrefs — `links` is partner-authored content. */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Bare hostname for analytics (`www.` stripped); never the full URL. */
export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function positiveOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;
}
