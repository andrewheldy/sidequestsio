import { getConfig } from '../config';

export type RpcFailure =
  | 'not_configured'
  | 'timeout'
  | 'aborted'
  | 'network'
  | 'http'
  | 'bad_response'
  // Server-defined codes from {ok:false, error}.
  | (string & {});

export type RpcResult<T> = { ok: true; data: T } | { ok: false; error: RpcFailure; status?: number };

export type RpcOptions = { accessToken?: string | null; signal?: AbortSignal; timeoutMs?: number };

/**
 * Calls a Supabase RPC through PostgREST. Bodies can hold device coordinates,
 * so nothing here logs a request or response.
 */
export async function callRpc<T>(name: string, args: Record<string, unknown>, options: RpcOptions = {}) {
  return request<T>(`rpc/${name}`, { method: 'POST', body: JSON.stringify(args) }, options);
}

/** Upserts a row the caller owns (RLS decides). Used for user-owned preference tables. */
export async function upsertRow(table: string, row: Record<string, unknown>, onConflict: string, options: RpcOptions = {}) {
  return request<unknown>(
    `${table}?on_conflict=${encodeURIComponent(onConflict)}`,
    { method: 'POST', body: JSON.stringify(row), headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } },
    options,
  );
}

async function request<T>(path: string, init: RequestInit, options: RpcOptions): Promise<RpcResult<T>> {
  const { supabaseUrl, supabaseKey } = getConfig();
  if (!supabaseUrl || !supabaseKey) return { ok: false, error: 'not_configured' };

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? 10_000);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort);
  if (options.signal?.aborted) controller.abort();

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${options.accessToken ?? supabaseKey}`,
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    if (!response.ok) return { ok: false, error: 'http', status: response.status };
    const text = await response.text();
    const data = text ? (JSON.parse(text) as unknown) : null;
    if (data && typeof data === 'object' && (data as { ok?: unknown }).ok === false) {
      const code = (data as { error?: unknown }).error;
      return { ok: false, error: typeof code === 'string' ? code : 'bad_response' };
    }
    return { ok: true, data: data as T };
  } catch (error) {
    if (timedOut) return { ok: false, error: 'timeout' };
    if (controller.signal.aborted) return { ok: false, error: 'aborted' };
    return { ok: false, error: error instanceof SyntaxError ? 'bad_response' : 'network' };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}
