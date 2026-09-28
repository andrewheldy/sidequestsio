/**
 * Supabase analytics sink → public.record_analytics_events (0020).
 *
 * Off by default. It registers only when the build sets
 * VITE_ANALYTICS_SINK=supabase *and* Supabase is configured, and it is a
 * `remote` sink, so `track()` hands it events only for visitors who opted
 * into analytics cookies.
 *
 * Delivery never blocks the UI: events are queued in memory and flushed in
 * batches (every few seconds, at 20 events, or when the tab is hidden). A
 * failed flush drops that batch rather than retrying forever.
 */

import type { AppEvent } from "@/types/events";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";
import { registerSink } from "./events";

const FLUSH_INTERVAL_MS = 5_000;
const FLUSH_AT = 20;
const MAX_QUEUE = 200;

const queue: AppEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function schedule() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, FLUSH_INTERVAL_MS);
}

async function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, 50);
  try {
    const sb = await getSupabase();
    // user_id is derived server-side from the session; never sent.
    await sb?.rpc("record_analytics_events", {
      p_events: batch.map(({ user_id: _user, ...event }) => event),
    });
  } catch {
    /* best-effort: analytics must never surface an error */
  }
  if (queue.length > 0) schedule();
}

function supabaseSink(event: AppEvent) {
  if (queue.length >= MAX_QUEUE) queue.shift();
  queue.push(event);
  if (queue.length >= FLUSH_AT) void flush();
  else schedule();
}

export function registerSupabaseAnalyticsSink(): void {
  if (import.meta.env.VITE_ANALYTICS_SINK !== "supabase" || !supabaseConfigured()) return;
  registerSink(supabaseSink, { remote: true });
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void flush();
    });
  }
}
