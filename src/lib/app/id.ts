/**
 * Tiny dependency-free id + code generators.
 * Used by the local repository and for human-facing redemption codes.
 */

const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function nanoid(size = 21): string {
  let id = "";
  const bytes =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(size))
      : Array.from({ length: size }, () => Math.floor(Math.random() * 256));
  for (let i = 0; i < size; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}

/** Human-readable code, e.g. for QR slugs and redemption codes: "A3F9-7KQ2". */
export function shortCode(groups = 2, groupSize = 4): string {
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  const out: string[] = [];
  for (let g = 0; g < groups; g++) {
    let s = "";
    for (let i = 0; i < groupSize; i++) {
      s += upper[Math.floor(Math.random() * upper.length)];
    }
    out.push(s);
  }
  return out.join("-");
}
