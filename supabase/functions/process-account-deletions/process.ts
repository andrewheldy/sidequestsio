/**
 * Account deletion processing (supabase/migrations/0024_account_deletion_requests.sql,
 * docs/legal/Delete-Account.md). Runs with the service role only — see index.ts.
 *
 * Each pending request goes through the same steps, and every step is safe to
 * repeat, so a failed or interrupted run is simply retried by the next one:
 *   1. capture the account email for the confirmation (§5)
 *   2. process_account_deletion_data(): partner owners are flagged for manual
 *      review and stop here; otherwise app data is deleted in one transaction
 *   3. remove Storage objects under proofs/<uid>/ and avatars/<uid>/
 *   4. delete the auth user (already gone counts as done)
 *   5. mark the request completed
 */
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const STORAGE_BUCKETS = ['proofs', 'avatars'] as const;
const LIST_PAGE = 1000;
const REMOVE_CHUNK = 100;
const MAX_ERROR_LENGTH = 300;

export interface PendingRequest {
  id: string;
  user_id: string;
  data_deleted_at: string | null;
  notify_email: string | null;
  attempts: number;
}

export type Outcome = 'completed' | 'manual_review' | 'not_pending';

/** Request ids only: the report is logged and returned, so it carries no user ids or emails. */
export interface RunReport {
  examined: number;
  completed: string[];
  manualReview: string[];
  skipped: string[];
  failed: { id: string; error: string }[];
}

function isNotFound(error: unknown): boolean {
  const e = error as { status?: number; code?: string } | null;
  return e?.status === 404 || e?.code === 'user_not_found';
}

function errorText(error: unknown): string {
  const message = error instanceof Error ? error.message : (error as { message?: string } | null)?.message;
  return (message || 'unknown error').slice(0, MAX_ERROR_LENGTH);
}

/** All object paths below `prefix`, descending into folders (Storage lists one level at a time). */
export async function listObjectPaths(admin: SupabaseClient, bucket: string, prefix: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += LIST_PAGE) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: LIST_PAGE, offset });
    if (error) throw error;
    for (const item of data ?? []) {
      const path = `${prefix}/${item.name}`;
      // Folders are listed without an id.
      if (item.id === null) paths.push(...(await listObjectPaths(admin, bucket, path)));
      else paths.push(path);
    }
    if ((data ?? []).length < LIST_PAGE) return paths;
  }
}

export async function removeUserObjects(admin: SupabaseClient, userId: string): Promise<void> {
  for (const bucket of STORAGE_BUCKETS) {
    const paths = await listObjectPaths(admin, bucket, userId);
    for (let i = 0; i < paths.length; i += REMOVE_CHUNK) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + REMOVE_CHUNK));
      if (error) throw error;
    }
  }
}

export async function processRequest(admin: SupabaseClient, request: PendingRequest): Promise<Outcome> {
  // 1. Keep the address for the confirmation email before the auth user is deleted.
  if (!request.data_deleted_at && request.notify_email === null) {
    const { data, error } = await admin.auth.admin.getUserById(request.user_id);
    if (error && !isNotFound(error)) throw error;
    const email = data?.user?.email ?? null;
    if (email) {
      const { error: saveError } = await admin
        .from('account_deletion_requests')
        .update({ notify_email: email })
        .eq('id', request.id)
        .eq('status', 'pending');
      if (saveError) throw saveError;
    }
  }

  // 2. App data, transactional; partner owners stop here before anything is deleted.
  const { data: result, error: rpcError } = await admin.rpc('process_account_deletion_data', { p_request_id: request.id });
  if (rpcError) throw rpcError;
  const outcome = result as { ok?: boolean; error?: string; outcome?: string } | null;
  if (!outcome?.ok) throw new Error(`process_account_deletion_data: ${outcome?.error ?? 'no result'}`);
  if (outcome.outcome === 'manual_review') return 'manual_review';
  if (outcome.outcome === 'not_pending') return 'not_pending';
  if (outcome.outcome !== 'data_deleted') throw new Error(`unexpected outcome: ${outcome.outcome}`);

  // 3. Uploaded media.
  await removeUserObjects(admin, request.user_id);

  // 4. The login itself.
  const { error: deleteError } = await admin.auth.admin.deleteUser(request.user_id);
  if (deleteError && !isNotFound(deleteError)) throw deleteError;

  // 5. Done. notify_email stays until support records the confirmation email.
  const { error: completeError } = await admin
    .from('account_deletion_requests')
    .update({ status: 'completed', completed_at: new Date().toISOString(), last_error: null })
    .eq('id', request.id)
    .eq('status', 'pending');
  if (completeError) throw completeError;
  return 'completed';
}

async function recordFailure(admin: SupabaseClient, request: PendingRequest, message: string): Promise<void> {
  // Best effort: if even this write fails, the request is still pending and is retried.
  await admin
    .from('account_deletion_requests')
    .update({ attempts: request.attempts + 1, last_attempt_at: new Date().toISOString(), last_error: message })
    .eq('id', request.id);
}

/** Processes up to `limit` pending, unflagged requests, oldest first, one at a time. */
export async function processPendingDeletions(admin: SupabaseClient, { limit }: { limit: number }): Promise<RunReport> {
  const { data, error } = await admin
    .from('account_deletion_requests')
    .select('id, user_id, data_deleted_at, notify_email, attempts')
    .eq('status', 'pending')
    .is('manual_review_reason', null)
    .order('requested_at', { ascending: true })
    .limit(limit);
  if (error) throw error;

  const report: RunReport = { examined: 0, completed: [], manualReview: [], skipped: [], failed: [] };
  for (const request of (data ?? []) as PendingRequest[]) {
    report.examined += 1;
    try {
      const outcome = await processRequest(admin, request);
      if (outcome === 'completed') report.completed.push(request.id);
      else if (outcome === 'manual_review') report.manualReview.push(request.id);
      else report.skipped.push(request.id);
    } catch (e) {
      const message = errorText(e);
      report.failed.push({ id: request.id, error: message });
      await recordFailure(admin, request, message);
    }
  }
  return report;
}
