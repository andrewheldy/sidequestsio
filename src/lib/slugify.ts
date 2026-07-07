/**
 * Slugifies heading text into the anchor IDs used by legal-doc tables of
 * contents (e.g. "1. Information We Collect" -> "1-information-we-collect").
 * The `docs/legal/*.md` files hand-write TOC links against this exact
 * scheme, so any change here must stay in sync with those anchors.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
