/**
 * Anonymous session tracking (Phase 4 / Phase 6).
 *
 * Before a user authenticates we still need a stable handle to attribute scans
 * and quest previews to. We mint a random session id, persist it in
 * localStorage, and later "link" it to the authenticated user so their pre-auth
 * scan context is preserved through the sign-in boundary.
 */

import { nanoid } from "./id";

const SESSION_KEY = "sq.anon_session_id";
const PENDING_SCAN_KEY = "sq.pending_scan"; // scan context to resume after auth

export function getAnonymousSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `anon_${nanoid(16)}`;
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export interface PendingScanContext {
  questId: string;
  scanId: string;
  code?: string;
}

/** Remember a scan so we can continue the completion flow after sign-in. */
export function setPendingScan(ctx: PendingScanContext): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_SCAN_KEY, JSON.stringify(ctx));
}

export function getPendingScan(): PendingScanContext | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PENDING_SCAN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingScanContext;
  } catch {
    return null;
  }
}

export function clearPendingScan(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_SCAN_KEY);
}
