/**
 * Local-time quiet-hours check in an IANA timezone. The server's claim_nudge
 * is authoritative; this lets the device skip a doomed network call. An
 * unknown or invalid timezone returns 'unknown', which callers treat as quiet.
 */
export function quietHoursState(now: Date, timeZone: string | null, start = '21:00', end = '10:00'): 'quiet' | 'open' | 'unknown' {
  if (!timeZone) return 'unknown';
  let minutes: number;
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 'unknown';
    minutes = (hour % 24) * 60 + minute;
  } catch {
    return 'unknown';
  }
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const s = toMinutes(start);
  const e = toMinutes(end);
  const quiet = s <= e ? minutes >= s && minutes < e : minutes >= s || minutes < e;
  return quiet ? 'quiet' : 'open';
}

export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}
