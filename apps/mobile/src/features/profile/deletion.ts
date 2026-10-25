import { supportEmail } from '../../lib/config';
import { requireSupabase } from '../../lib/supabase';

export const DELETION_SUBJECT = 'Account Deletion Request';

/**
 * In-app deletion requests (supabase/migrations/0030_account_deletion_requests.sql).
 * The app only records or cancels the request; support processes it within 30
 * days with a server-only job (docs/legal/Delete-Account.md). Nothing here
 * deletes data. Until 0030 is applied the calls report `unsupported` and the
 * screen falls back to the emailed request.
 */
export interface DeletionRequest {
  id: string;
  status: 'pending' | 'cancelled' | 'completed';
  requested_at: string;
  process_by: string;
}

export class DeletionUnsupportedError extends Error {
  constructor() {
    super('In-app deletion requests are not available on this server yet.');
    this.name = 'DeletionUnsupportedError';
  }
}

// PGRST202: function not found; PGRST205 / 42P01: table not found (0030 not applied).
const MISSING_CODES = new Set(['PGRST202', 'PGRST205', '42P01', '42883']);
const isMissing = (error: unknown) => MISSING_CODES.has((error as { code?: string } | null)?.code ?? '');

function fail(error: unknown): never {
  if (isMissing(error)) throw new DeletionUnsupportedError();
  throw error instanceof Error ? error : new Error('The request could not be completed. Please try again.');
}

/** The caller's open request, or null. Throws DeletionUnsupportedError before 0030. */
export async function getPendingDeletion(userId: string): Promise<DeletionRequest | null> {
  const { data, error } = await requireSupabase()
    .from('account_deletion_requests')
    .select('id, status, requested_at, process_by')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .maybeSingle();
  if (error) fail(error);
  return (data as DeletionRequest | null) ?? null;
}

async function callDeletionRpc(name: 'request_account_deletion' | 'cancel_account_deletion'): Promise<DeletionRequest | null> {
  const { data, error } = await requireSupabase().rpc(name);
  if (error) fail(error);
  const res = data as { ok?: boolean; error?: string; request?: DeletionRequest } | null;
  if (res?.ok && res.request) return res.request;
  if (name === 'cancel_account_deletion' && res?.error === 'not_pending') return null;
  throw new Error(res?.error === 'not_authenticated' ? 'Your session has ended. Sign in again.' : 'The request could not be completed. Please try again.');
}

/** Idempotent on the server: repeated calls return the same pending request. */
export const requestAccountDeletion = () => callDeletionRpc('request_account_deletion');

/** Resolves null when there was nothing pending to cancel. */
export const cancelAccountDeletion = () => callDeletionRpc('cancel_account_deletion');

/** Fallback before 0030: a prefilled email that identifies the account. */
export function deletionMailto(email: string | null | undefined, userId: string): string {
  const body = [
    'Please delete my SideQuests account and associated personal data.',
    '',
    `Account email: ${email ?? '(unknown)'}`,
    `User ID: ${userId}`,
  ].join('\n');
  return `mailto:${supportEmail}?subject=${encodeURIComponent(DELETION_SUBJECT)}&body=${encodeURIComponent(body)}`;
}

export function supportMailto(): string {
  return `mailto:${supportEmail}?subject=${encodeURIComponent('SideQuests support')}`;
}
