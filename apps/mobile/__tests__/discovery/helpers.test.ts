import { distanceToQuest, formatMiles, haversineMiles } from '../../src/features/discovery/geo';
import { directionsUrl, isHttpsUrl, questLinkItems } from '../../src/features/discovery/questFormat';
import { quest } from './fixtures';

const q = quest as unknown as (id: string, extra?: Record<string, unknown>) => import('../../src/lib/types').QuestWithContext;

it('computes haversine distance in miles', () => {
  const d = haversineMiles({ latitude: 25.7617, longitude: -80.1918 }, { latitude: 26.1224, longitude: -80.1373 });
  expect(d).toBeGreaterThan(24);
  expect(d).toBeLessThan(26);
  expect(formatMiles(0.04)).toBe('<0.1 mi');
  expect(formatMiles(1.26)).toBe('1.3 mi');
});

it('never invents a distance', () => {
  const noCoords = q('x', { venue: { latitude: null, longitude: null } });
  expect(distanceToQuest({ latitude: 25, longitude: -80 }, noCoords)).toBeNull();
  expect(distanceToQuest(null, q('y'))).toBeNull();
});

it('accepts only https links', () => {
  expect(isHttpsUrl('https://a.test')).toBe(true);
  expect(isHttpsUrl('http://a.test')).toBe(false);
  expect(isHttpsUrl('javascript:alert(1)')).toBe(false);
  expect(questLinkItems({ website_url: 'https://a.test', tiktok_url: 'ftp://x' }).map((l) => l.key)).toEqual(['website_url']);
});

it('builds directions from coordinates, else address, else nothing', () => {
  expect(directionsUrl(q('a'), 'ios')).toContain('maps.apple.com/?daddr=25.8%2C-80.19');
  expect(directionsUrl(q('a'), 'android')).toContain('google.com/maps/dir/?api=1&destination=25.8%2C-80.19');
  const addressOnly = q('b', { venue: { name: 'V', address: '1 Test St', city: 'Miami', latitude: null, longitude: null } });
  expect(directionsUrl(addressOnly, 'android')).toContain(encodeURIComponent('1 Test St, Miami'));
  expect(directionsUrl(q('c', { venue: null }), 'ios')).toBeNull();
});
