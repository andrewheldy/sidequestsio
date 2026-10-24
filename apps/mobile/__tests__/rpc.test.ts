import { callRpc } from '../src/lib/api/rpc';

const realFetch = global.fetch;

beforeEach(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://project.example.co/';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable';
});
afterEach(() => {
  global.fetch = realFetch;
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  jest.useRealTimers();
});

const respond = (body: unknown, status = 200) =>
  jest.fn(async () => ({ ok: status < 400, status, text: async () => JSON.stringify(body) }) as unknown as Response);

describe('callRpc', () => {
  it('reports not_configured without a URL or key', async () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    await expect(callRpc('x', {})).resolves.toEqual({ ok: false, error: 'not_configured' });
  });

  it('posts to the RPC endpoint with the user token and returns data', async () => {
    global.fetch = respond({ ok: true, items: [] });
    await expect(callRpc('discover_nearby', { a: 1 }, { accessToken: 'jwt' })).resolves.toEqual({ ok: true, data: { ok: true, items: [] } });
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://project.example.co/rest/v1/rpc/discover_nearby');
    expect(init.headers).toMatchObject({ apikey: 'publishable', Authorization: 'Bearer jwt' });
  });

  it('maps structured server errors and HTTP failures', async () => {
    global.fetch = respond({ ok: false, error: 'invalid_cursor' });
    await expect(callRpc('x', {})).resolves.toEqual({ ok: false, error: 'invalid_cursor' });
    global.fetch = respond({ message: 'boom' }, 500);
    await expect(callRpc('x', {})).resolves.toEqual({ ok: false, error: 'http', status: 500 });
  });

  it('times out within its budget and never logs the request body', async () => {
    jest.useFakeTimers();
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    global.fetch = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new Error('aborted')))),
    ) as unknown as typeof fetch;
    const pending = callRpc('claim_nudge', { p_lat: 25.79 }, { timeoutMs: 3000 });
    jest.advanceTimersByTime(3000);
    await expect(pending).resolves.toEqual({ ok: false, error: 'timeout' });
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('distinguishes a caller abort from a timeout', async () => {
    global.fetch = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new Error('aborted')))),
    ) as unknown as typeof fetch;
    const controller = new AbortController();
    const pending = callRpc('x', {}, { signal: controller.signal });
    controller.abort();
    await expect(pending).resolves.toEqual({ ok: false, error: 'aborted' });
  });
});
