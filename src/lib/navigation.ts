/**
 * Only accept in-app destinations for post-auth redirects: a relative path
 * that can't be abused as an open redirect ("//evil.com", "https://…",
 * backslash tricks). Anything else is discarded.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null;
  return raw;
}
