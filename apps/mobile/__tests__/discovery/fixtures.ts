import type { RecordedCall } from '../support/fakeSupabase';

/** Quest rows shaped like `quests` + joined venue/partner. Test data only. */
export const venue = (extra: Record<string, unknown> = {}) => ({
  id: 'v-1',
  partner_id: 'p-1',
  name: 'Test Venue One',
  address: '1 Test St',
  city: 'Miami',
  latitude: 25.8,
  longitude: -80.19,
  status: 'active',
  neighborhood: 'Wynwood',
  ...extra,
});

export const quest = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  partner_id: 'p-1',
  venue_id: 'v-1',
  title: `Quest ${id}`,
  description: `Description for ${id}`,
  category: 'art',
  difficulty: 'easy',
  xp_reward: 120,
  points_reward: 45,
  status: 'active',
  start_date: null,
  end_date: null,
  verification_type: 'qr',
  image_url: null,
  created_at: '2026-01-01T00:00:00Z',
  venue: venue(),
  partner: { id: 'p-1', name: 'Partner', status: 'active' },
  ...extra,
});

/** Serves list and detail reads for the given quest rows. */
export const questsHandler = (rows: Record<string, unknown>[]) => (call: RecordedCall) => {
  if (call.name !== 'quests') return undefined;
  if (call.ops.some((o) => o.op === 'maybeSingle')) {
    const eq = call.ops.find((o) => o.op === 'eq');
    return { data: rows.find((r) => r.id === eq?.args[1]) ?? null };
  }
  return { data: rows };
};

export const profileRow = (userId: string) => ({ user_id: userId, onboarding_completed: true });
