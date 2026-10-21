import { webOrigin } from '../../lib/config';

/**
 * Printed codes encode `<site origin>/scan/<CODE>` (0018_scan_verification.sql).
 * A scanned payload is accepted ONLY if it is an https URL on the site origin
 * host (or its www. variant) whose path is exactly /scan/<code>. Bare codes,
 * other hosts, http, extra path segments, query strings, credentials and other
 * schemes are all rejected. The URL is parsed, never opened or fetched.
 */
const CODE = /^[A-Za-z0-9]{4,32}$/;

function allowedHosts(origin: string): string[] {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    const bare = host.replace(/^www\./, '');
    return [bare, `www.${bare}`];
  } catch {
    return [];
  }
}

/** Returns the code (upper-cased; the server compares case-insensitively) or null. */
export function parseScanPayload(payload: unknown, origin: string = webOrigin): string | null {
  if (typeof payload !== 'string') return null;
  const text = payload.trim();
  if (text.length === 0 || text.length > 300) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (url.username || url.password || url.port || url.search || url.hash) return null;
  if (!allowedHosts(origin).includes(url.hostname.toLowerCase())) return null;
  const match = /^\/scan\/([^/]+)$/.exec(url.pathname);
  if (!match || !CODE.test(match[1])) return null;
  return match[1].toUpperCase();
}
