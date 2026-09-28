/**
 * Responsive sizing for remote images. Hosts with a resizing API get a real
 * `srcset` so phones never download desktop-sized photos; any other URL is
 * used as-is.
 */
export function responsiveImage(
  url: string,
  widths: number[],
): { src: string; srcSet?: string } {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "images.unsplash.com") {
      const at = (w: number) => {
        const u = new URL(parsed.toString());
        u.searchParams.set("w", String(w));
        u.searchParams.delete("h");
        u.searchParams.set("auto", "format");
        u.searchParams.set("q", "75");
        return u.toString();
      };
      return {
        src: at(widths[Math.min(1, widths.length - 1)]),
        srcSet: widths.map((w) => `${at(w)} ${w}w`).join(", "),
      };
    }
  } catch {
    /* not a URL we can rewrite */
  }
  return { src: url };
}
