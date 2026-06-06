/**
 * Reusable event-tracking utility (Phase 12).
 *
 * `track(name, context)` is the single call-site product code uses. Events are
 * fanned out to a list of sinks. By default we register a privacy-safe local
 * sink (a capped ring buffer in localStorage, surfaced in the admin analytics
 * view). In production a Supabase/warehouse sink can be registered at boot
 * without touching any call-site.
 */

import type { AppEvent, AppEventContext, AppEventName } from "@/types/events";
import { getAnonymousSessionId } from "@/lib/app/session";

export type EventSink = (event: AppEvent) => void;

const sinks: EventSink[] = [];
const LOCAL_KEY = "sq.events";
const MAX_LOCAL_EVENTS = 500;

export function registerSink(sink: EventSink): void {
  sinks.push(sink);
}

/** Emit a typed product event. Never throws — analytics must not break UX. */
export function track(name: AppEventName, context: AppEventContext = {}): void {
  try {
    const event: AppEvent = {
      name,
      timestamp: new Date().toISOString(),
      anonymous_session_id: context.anonymous_session_id ?? getAnonymousSessionId(),
      ...context,
    };
    for (const sink of sinks) {
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

// Register the local sink once on module load.
registerSink(localEventSink);
