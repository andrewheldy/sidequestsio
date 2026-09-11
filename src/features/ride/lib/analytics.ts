/**
 * Anonymous, local-only analytics. Events are held in memory for the current
 * session and logged to the console in dev. Nothing leaves the device; no
 * passenger identity is ever recorded (see docs/product privacy position).
 */
export type AnalyticsEventType =
  | 'session_started'
  | 'module_opened'
  | 'content_opened'
  | 'content_impression'
  | 'game_started'
  | 'game_completed'
  | 'sidequest_opened'
  | 'handoff_created'
  | 'handoff_opened'
  | 'community_opened'
  | 'screen_slept'
  | 'screen_woke'

export interface AnalyticsEvent {
  type: AnalyticsEventType
  at: number
  sessionId: string
  props?: Record<string, string | number | boolean>
}

function randomId(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

let sessionId = ''
const events: AnalyticsEvent[] = []

function currentSessionId(): string {
  if (!sessionId) sessionId = randomId()
  return sessionId
}

/** Reset the anonymous session id (a new rider tapped in). */
export function rotateAnalyticsSession(): string {
  sessionId = randomId()
  return sessionId
}

export function track(
  type: AnalyticsEventType,
  props?: Record<string, string | number | boolean>,
): AnalyticsEvent {
  const event: AnalyticsEvent = { type, at: Date.now(), sessionId: currentSessionId(), props }
  events.push(event)
  if (import.meta.env.DEV) {
    console.debug('[feed-analytics]', event.type, event.props ?? {})
  }
  return event
}

export function getRecordedEvents(): readonly AnalyticsEvent[] {
  return events
}
