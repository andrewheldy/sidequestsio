/**
 * Credit for a licensed quest photo (quests.image_attribution, 0025).
 *
 * CC BY / BY-SA require, at the point of use: the creator, a link to the
 * source, the license name with a link, and whether the photo was changed.
 * Public-domain / CC0 photos need none, so they carry no attribution row.
 */

export interface ImageAttribution {
  creator: string;
  /** Where the original lives, e.g. its Wikimedia Commons file page. */
  source_url: string;
  /** Short license name, e.g. "CC BY 2.0". */
  license: string;
  license_url: string;
  /** e.g. "Wikimedia Commons". */
  source_name?: string | null;
  /** True when the published file is an adaptation (cropped, resized…). */
  modified?: boolean | null;
}

const isHttpUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//i.test(v);

/**
 * The attribution to display, or null when the stored value is missing or
 * incomplete. Incomplete credit is never shown half-rendered.
 */
export function readAttribution(value: unknown): ImageAttribution | null {
  if (!value || typeof value !== "object") return null;
  const a = value as Record<string, unknown>;
  if (typeof a.creator !== "string" || !a.creator.trim()) return null;
  if (typeof a.license !== "string" || !a.license.trim()) return null;
  if (!isHttpUrl(a.source_url) || !isHttpUrl(a.license_url)) return null;
  return {
    creator: a.creator.trim(),
    source_url: a.source_url,
    license: a.license.trim(),
    license_url: a.license_url,
    source_name: typeof a.source_name === "string" && a.source_name.trim() ? a.source_name.trim() : null,
    modified: a.modified === true,
  };
}

/** Plain-text credit, e.g. "Photo: Jane Doe / Wikimedia Commons, CC BY 2.0, cropped". */
export function attributionText(a: ImageAttribution): string {
  const by = a.source_name ? `${a.creator} / ${a.source_name}` : a.creator;
  return `Photo: ${by}, ${a.license}${a.modified ? ", cropped" : ""}`;
}
