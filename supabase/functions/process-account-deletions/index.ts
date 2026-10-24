/**
 * process-account-deletions — processes in-app account deletion requests
 * (supabase/migrations/0030_account_deletion_requests.sql). Logic: process.ts.
 *
 * Service role only. `withSupabase({ auth: 'secret' })` rejects any caller that
 * does not present the project's secret API key (users' JWTs and the
 * publishable key are refused), and gives the handler the privileged client.
 * Never call it from an app.
 *
 * Deploy (JWT verification off, because callers send the secret key instead):
 *   supabase functions deploy process-account-deletions --no-verify-jwt
 * Run once by hand:
 *   curl -X POST "$SUPABASE_URL/functions/v1/process-account-deletions" \
 *     -H "apikey: $SECRET_KEY" -H "Content-Type: application/json" -d '{"limit": 5}'
 * Schedule daily with pg_cron + pg_net (secret key and URL stored in Vault):
 *   select cron.schedule('process-account-deletions', '0 9 * * *', $$
 *     select net.http_post(
 *       url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
 *              || '/functions/v1/process-account-deletions',
 *       headers := jsonb_build_object('Content-Type', 'application/json',
 *         'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'secret_key')),
 *       body := '{"limit": 25}'::jsonb);
 *   $$);
 *
 * Support follow-ups (no email provider is configured):
 *   -- flagged for a person (partner owners):
 *   select id, requested_at, process_by, manual_review_reason from account_deletion_requests
 *    where status = 'pending' and manual_review_reason is not null;
 *   -- confirmation emails to send (§5), then clear the address:
 *   select id, notify_email, completed_at from account_deletion_requests
 *    where status = 'completed' and confirmation_sent_at is null;
 *   update account_deletion_requests set confirmation_sent_at = now(), notify_email = null where id = '<id>';
 */
import { withSupabase } from 'npm:@supabase/server@1';
import { processPendingDeletions } from './process.ts';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

async function readLimit(req: Request): Promise<number> {
  try {
    const body = (await req.json()) as { limit?: unknown };
    if (typeof body.limit === 'number' && Number.isInteger(body.limit)) {
      return Math.min(Math.max(body.limit, 1), MAX_LIMIT);
    }
  } catch {
    // Empty or non-JSON body: use the default.
  }
  return DEFAULT_LIMIT;
}

export default {
  fetch: withSupabase({ auth: 'secret' }, async (req, ctx) => {
    if (req.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 });
    try {
      const report = await processPendingDeletions(ctx.supabaseAdmin, { limit: await readLimit(req) });
      console.log(JSON.stringify({ fn: 'process-account-deletions', ...report }));
      return Response.json(report);
    } catch (e) {
      // Could not even list requests (e.g. 0030 not applied). Nothing was changed.
      const message = e instanceof Error ? e.message : 'unknown error';
      console.error(JSON.stringify({ fn: 'process-account-deletions', error: message }));
      return Response.json({ error: 'listing_failed', message }, { status: 500 });
    }
  }),
};
