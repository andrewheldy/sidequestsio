import { requireSupabase } from '../../lib/supabase';
import type { Reward } from '../../lib/types';

/**
 * Read-only catalogue of active rewards (public read: RLS rewards_public_read +
 * grant). Redemption is deliberately not implemented in the app: there is no
 * partner fulfilment flow yet, so a redeemed code could never be honoured.
 */
export async function listActiveRewards(now = Date.now()): Promise<Reward[]> {
  const { data, error } = await requireSupabase()
    .from('rewards')
    .select('*')
    .eq('status', 'active')
    .order('points_cost', { ascending: true })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as Reward[]).filter(
    (r) => r.status === 'active' && (!r.expiration_date || Date.parse(r.expiration_date) > now),
  );
}

/** Honest availability from inventory: null means unlimited. */
export function availabilityLabel(reward: Pick<Reward, 'inventory'>): string {
  if (reward.inventory == null) return 'Available';
  if (reward.inventory <= 0) return 'Out of stock';
  return `${reward.inventory} left`;
}
