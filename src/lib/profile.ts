/**
 * Profile helpers
 * ---------------
 * Pure, dependency-free utilities for the Profile experience:
 *   - normalising social handles/URLs into canonical links
 *   - validating usernames + avatar files
 *   - compressing avatars in the browser (canvas, no extra deps)
 *
 * Keeping these here (and pure where possible) makes them easy to reason about
 * and keeps the components/UI thin.
 */

import { supabase } from '@/lib/supabase';

// ── Social links ───────────────────────────────────────────────────────────

export type SocialPlatform = 'instagram' | 'tiktok' | 'x';

const SOCIAL_CONFIG: Record<
  SocialPlatform,
  { base: (handle: string) => string; allowed: RegExp; hosts: string[]; tiktokAt?: boolean }
> = {
  instagram: {
    base: (h) => `https://instagram.com/${h}`,
    allowed: /[^a-zA-Z0-9._]/g,
    hosts: ['instagram.com', 'www.instagram.com'],
  },
  tiktok: {
    base: (h) => `https://tiktok.com/@${h}`,
    allowed: /[^a-zA-Z0-9._]/g,
    hosts: ['tiktok.com', 'www.tiktok.com'],
    tiktokAt: true,
  },
  x: {
    base: (h) => `https://x.com/${h}`,
    allowed: /[^a-zA-Z0-9_]/g,
    hosts: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
  },
};

/**
 * Extract the bare handle from whatever the user typed — a raw handle
 * (`@name`, `name`) or a full/partial URL — then strip unsafe characters.
 * Returns `''` when there's nothing usable.
 */
export function extractHandle(raw: string, platform: SocialPlatform): string {
  const cfg = SOCIAL_CONFIG[platform];
  let value = (raw ?? '').trim();
  if (!value) return '';

  // If it looks like a URL (or host/path), pull out the first path segment.
  const looksLikeUrl = /[./]/.test(value) && /\w[./]\w/.test(value);
  if (looksLikeUrl) {
    try {
      const url = new URL(value.startsWith('http') ? value : `https://${value}`);
      const host = url.hostname.toLowerCase();
      if (cfg.hosts.includes(host)) {
        value = url.pathname.split('/').filter(Boolean)[0] ?? '';
      }
      // If it's some other host, fall through and treat the raw text as a handle.
    } catch {
      /* not a parseable URL — treat as a handle below */
    }
  }

  value = value.replace(/^@+/, ''); // drop leading @(s)
  value = value.replace(cfg.allowed, ''); // strip unsafe chars
  return value.slice(0, 40);
}

/**
 * Normalise a user-entered social value into a canonical URL, or `null` if the
 * field is empty. Accepts a handle or a full URL.
 */
export function normalizeSocialLink(raw: string, platform: SocialPlatform): string | null {
  const handle = extractHandle(raw, platform);
  if (!handle) return null;
  return SOCIAL_CONFIG[platform].base(handle);
}

/** Friendly `@handle` for display, derived from a stored canonical URL. */
export function handleFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const segments = new URL(url).pathname.split('/').filter(Boolean);
    const handle = (segments[0] ?? '').replace(/^@+/, '');
    return handle ? `@${handle}` : null;
  } catch {
    return null;
  }
}

// ── Username ────────────────────────────────────────────────────────────────

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

/** Normalise to the canonical lowercase form we store/compare. */
export function normalizeUsername(raw: string): string {
  return (raw ?? '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

/** Returns an error string, or `null` when the username is valid. */
export function validateUsername(raw: string): string | null {
  const u = normalizeUsername(raw);
  if (!u) return 'Pick a username.';
  if (u.length < 3) return 'Username needs at least 3 characters.';
  if (u.length > 20) return 'Username can be at most 20 characters.';
  if (!USERNAME_RE.test(u)) return 'Use only letters, numbers and underscores.';
  return null;
}

// ── Avatar: validation + compression + upload ────────────────────────────────

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB pre-compression guard
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Returns an error string, or `null` when the file is an acceptable image. */
export function validateAvatarFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Please choose a JPG, PNG or WebP image.';
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return 'That image is over 5MB. Try a smaller one.';
  }
  return null;
}

/**
 * Downscale + re-encode an image entirely in the browser using a canvas, so we
 * never upload a giant photo. Falls back to the original file if anything goes
 * wrong (e.g. unsupported environment) — the bucket size limit is the backstop.
 */
export async function compressImage(
  file: File,
  { maxSize = 512, quality = 0.82 }: { maxSize?: number; quality?: number } = {},
): Promise<Blob> {
  try {
    const bitmap = await loadBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality),
    );
    // Only keep the compressed version if it actually helped.
    return blob && blob.size > 0 && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not read image'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Compress + upload an avatar to the `avatars` bucket under the user's own
 * folder, returning a public URL. Throws on failure (callers surface a toast).
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!supabase) throw new Error('Storage is not configured yet.');

  const compressed = await compressImage(file);
  const ext = compressed.type === 'image/webp' ? 'webp' : file.name.split('.').pop() || 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, compressed, { cacheControl: '3600', upsert: true, contentType: compressed.type });
  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}
