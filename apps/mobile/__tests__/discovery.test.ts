import { queryKey } from '../src/lib/discovery/api';
import { formatAvailability, formatDistance, reasonLabel } from '../src/lib/discovery/format';
import { diversifyTop } from '../src/lib/discovery/rerank';
import type { QuestCard } from '../src/lib/discovery/types';
import { assessSample, shouldRequery } from '../src/lib/location/quality';

function card(id: string, venueId: string, category: QuestCard['category']): QuestCard {
  return {
    id, title: id, description: '', category, difficulty: 'easy', xpReward: 50, pointsReward: 25, imageUrl: null,
    venueId, venueName: null, locationLabel: null, latitude: 25.8, longitude: -80.2, distanceM: 100,
    estimatedMinutes: null, verificationType: 'qr', accessNotes: null, isSponsored: false, startsAt: null, endsAt: null,
    availability: { state: 'unknown', closesAt: null }, reasons: [], score: 0.5,
  };
}

describe('diversifyTop', () => {
  it('limits one venue to two and one category to three in the first six', () => {
    const items = [
      card('a1', 'A', 'art'), card('a2', 'A', 'art'), card('a3', 'A', 'art'), card('b1', 'B', 'art'),
      card('c1', 'C', 'food'), card('d1', 'D', 'food'), card('e1', 'E', 'culture'), card('f1', 'F', 'outdoors'),
    ];
    const top = diversifyTop(items).slice(0, 6);
    expect(top.filter((q) => q.venueId === 'A')).toHaveLength(2);
    expect(top.filter((q) => q.category === 'art')).toHaveLength(3);
    expect(diversifyTop(items)).toHaveLength(items.length);
  });

  it('keeps order when there are no alternatives rather than inventing variety', () => {
    const items = [card('a1', 'A', 'art'), card('a2', 'A', 'art'), card('a3', 'A', 'art')];
    expect(diversifyTop(items).map((q) => q.id)).toEqual(['a1', 'a2', 'a3']);
  });
});

describe('formatting', () => {
  it('qualifies distance by origin and never shows an ETA', () => {
    expect(formatDistance(250, 'imperial')).toBe('Nearby');
    expect(formatDistance(1609, 'imperial')).toBe('About 1.0 mi away');
    expect(formatDistance(2500, 'metric', 'area')).toBe('About 2.5 km from center');
    expect(formatDistance(2500, 'metric', 'approximate')).toBe('In this area');
    expect(formatDistance(2500, 'metric')).not.toMatch(/min/);
  });

  it('only says open with structured hours', () => {
    expect(formatAvailability({ availability: { state: 'unknown', closesAt: null } })).toBe('Hours not confirmed');
    expect(formatAvailability({ availability: { state: 'closed', closesAt: null } })).toBe('Closed now');
    expect(formatAvailability({ availability: { state: 'open', closesAt: '2026-10-24T22:00:00Z' } })).toMatch(/^Open · closes /);
  });

  it('explains only known reason codes', () => {
    expect(reasonLabel('matches_art_interest')).toBe('Matches your interest in art');
    expect(reasonLabel('fits_15_minutes')).toBe('Fits in about 15 minutes');
    expect(reasonLabel('popular')).toBeNull();
  });
});

describe('location sample rules', () => {
  const now = 1_000_000;
  const sample = { latitude: 25.8, longitude: -80.2, accuracyM: 30, capturedAt: now, source: 'current' as const };

  it('grades freshness and accuracy', () => {
    expect(assessSample(sample, now)).toBe('precise');
    expect(assessSample({ ...sample, capturedAt: now - 121_000 }, now)).toBe('stale');
    expect(assessSample({ ...sample, accuracyM: 500 }, now)).toBe('coarse');
    expect(assessSample({ ...sample, accuracyM: null }, now)).toBe('coarse');
    expect(assessSample({ ...sample, latitude: 0, longitude: 0 }, now)).toBe('unusable');
    expect(assessSample({ ...sample, latitude: Number.NaN }, now)).toBe('unusable');
  });

  it('re-queries only after 200 m of movement and at most every 30 s', () => {
    const moved = { ...sample, latitude: 25.803 }; // ~330 m north
    expect(shouldRequery(null, sample, now)).toBe(true);
    expect(shouldRequery({ sample, queriedAt: now }, moved, now + 10_000)).toBe(false);
    expect(shouldRequery({ sample, queriedAt: now }, { ...sample, latitude: 25.8005 }, now + 60_000)).toBe(false);
    expect(shouldRequery({ sample, queriedAt: now }, moved, now + 31_000)).toBe(true);
  });

  it('keys queries by origin and filters', () => {
    const filters = { radiusKm: 3, categories: [], maxMinutes: null };
    expect(queryKey({ source: 'area', areaId: 'wynwood' }, filters)).not.toBe(queryKey({ source: 'area', areaId: 'brickell' }, filters));
    expect(queryKey({ source: 'map', latitude: 25.8, longitude: -80.2 }, filters)).not.toBe(
      queryKey({ source: 'device', latitude: 25.8, longitude: -80.2 }, filters),
    );
  });
});
