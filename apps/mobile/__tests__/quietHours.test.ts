import { quietHoursState } from '../src/lib/adventure/quietHours';

describe('quietHoursState (21:00–10:00 local)', () => {
  it.each([
    ['2026-07-01T00:30:00Z', 'America/New_York', 'open'], // 20:30 EDT
    ['2026-07-01T01:30:00Z', 'America/New_York', 'quiet'], // 21:30 EDT
    ['2026-07-01T13:59:00Z', 'America/New_York', 'quiet'], // 09:59 EDT
    ['2026-07-01T14:00:00Z', 'America/New_York', 'open'], // 10:00 EDT
    ['2026-07-01T14:00:00Z', 'Asia/Tokyo', 'quiet'], // 23:00 JST — not Miami time
    ['2026-07-01T03:00:00Z', 'Asia/Tokyo', 'open'], // 12:00 JST
  ])('%s in %s is %s', (iso, zone, expected) => {
    expect(quietHoursState(new Date(iso), zone)).toBe(expected);
  });

  it('uses the post-transition offset across DST changes', () => {
    // 2026-03-08 US spring forward: 14:30Z is 10:30 EDT (open); one day earlier 14:30Z is 09:30 EST (quiet).
    expect(quietHoursState(new Date('2026-03-08T14:30:00Z'), 'America/New_York')).toBe('open');
    expect(quietHoursState(new Date('2026-03-07T14:30:00Z'), 'America/New_York')).toBe('quiet');
    // 2026-11-01 fall back: 14:30Z is 09:30 EST (quiet); the day before it is 10:30 EDT (open).
    expect(quietHoursState(new Date('2026-11-01T14:30:00Z'), 'America/New_York')).toBe('quiet');
    expect(quietHoursState(new Date('2026-10-31T14:30:00Z'), 'America/New_York')).toBe('open');
  });

  it('fails conservatively for a missing or invalid timezone', () => {
    expect(quietHoursState(new Date(), null)).toBe('unknown');
    expect(quietHoursState(new Date(), 'Mars/Olympus_Mons')).toBe('unknown');
  });
});
