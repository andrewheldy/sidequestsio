import { isHttpsUrl } from '../discovery/questFormat';

/** Up to two initials from a name, falling back to "?" so the avatar is never empty. */
export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return letters.toUpperCase();
}

/** Avatars are only rendered from https URLs; anything else falls back to initials. */
export function avatarUri(url: string | null | undefined): string | null {
  return isHttpsUrl(url) ? url.trim() : null;
}

export function formatDate(iso: string | null | undefined): string {
  const time = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(time)) return '';
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
