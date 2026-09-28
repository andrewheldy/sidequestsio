/**
 * Reusable event-tracking utility (Phase 12).
 *
 * `track(name, context)` is the single call-site product code uses. Events are
 * fanned out to a list of sinks. By default we register a privacy-safe local
 * sink (a capped ring buffer in localStorage) and, in dev builds only, a
 * console sink. A warehouse / Supabase / vendor sink is registered at boot
 * with `registerSink(sink, { remote: true })` without touching any call-site.
 *
 * Delivery rules:
 *  - Never throws and never blocks: every sink runs inside its own try/catch,
 *    so a broken sink cannot break navigation, links or quest completion.
 *  - Remote sinks only receive events when the visitor opted into analytics
 *    cookies (docs/legal/Cookie-Policy.md). On-device sinks always run.
 *  - Remote sinks must deliver asynchronously (queue + `navigator.sendBeacon`
 *    or `fetch(..., { keepalive: true })`) so outbound links are never delayed.
 */

import type { AppEvent, AppEventContext, AppEventName } from "@/types/events";
import { getAnonymousSessionId, getBrowsingSessionId } from "@/lib/app/session";
import { detectDevice } from "@/lib/app/device";
import { hasAnalyticsConsent } from "@/lib/cookieConsent";

export type EventSink = (event: AppEvent) => void;

interface RegisteredSink {
  sink: EventSink;
  /** Leaves the device — gated on analytics consent. */
  remote: boolean;
}

const sinks: RegisteredSink[] = [];
const LOCAL_KEY = "sq.events";
const MAX_LOCAL_EVENTS = 500;

export function registerSink(sink: EventSink, options: { remote?: boolean } = {}): void {
  sinks.push({ sink, remote: !!options.remote });
}

/** Emit a typed product event. Never throws — analytics must not break UX. */
export function track(name: AppEventName, context: AppEventContext = {}): void {
  try {
    const event: AppEvent = {
      name,
      timestamp: new Date().toISOString(),
      anonymous_session_id: context.anonymous_session_id ?? getAnonymousSessionId(),
      ...pageEnvelope(),
      ...context,
    };
    const remoteAllowed = sinks.some((s) => s.remote) && hasAnalyticsConsent();
    for (const { sink, remote } of sinks) {
      if (remote && !remoteAllowed) continue;
      try {
        sink(event);
      } catch {
        /* a broken sink must not affect others */
      }
    }
  } catch {
    /* swallow — tracking is best-effort */
  }
}

let deviceType: string | undefined;

/** Coarse page context: path (no query string), device bucket, viewport width. */
function pageEnvelope(): Pick<AppEvent, "session_id" | "page_path" | "device_type" | "viewport_width"> {
  if (typeof window === "undefined") return {};
  deviceType ??= detectDevice().device_type;
  return {
    session_id: getBrowsingSessionId(),
    page_path: window.location.pathname,
    device_type: deviceType,
    viewport_width: window.innerWidth,
  };
}

/** Built-in local sink: capped ring buffer in localStorage. */
export const localEventSink: EventSink = (event) => {
  if (typeof window === "undefined") return;
  const list = readLocalEvents();
  list.push(event);
  while (list.length > MAX_LOCAL_EVENTS) list.shift();
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
};

export function readLocalEvents(): AppEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_KEY) ?? "[]") as AppEvent[];
  } catch {
    return [];
  }
}

export function clearLocalEvents(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCAL_KEY);
}

// Register the built-in sinks once on module load.
registerSink(localEventSink);
if (import.meta.env.DEV) {
  // Dev-only inspector; production builds never log events.
  registerSink((event) => console.debug("[analytics]", event.name, event));
}
