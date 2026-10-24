import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useDiscovery } from '../src/hooks/useDiscovery';
import type { DiscoveryOrigin } from '../src/lib/discovery/types';

const filters = { radiusKm: 3, categories: [], maxMinutes: null };
const page = (title: string) => ({
  ok: true, serverTime: '', origin: { source: 'area', areaId: title, label: title }, nextCursor: null,
  items: [{ id: title, title, category: 'art', venueId: title, reasons: [], availability: { state: 'unknown', closesAt: null } }],
});

beforeEach(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://project.example.co';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable';
});

describe('useDiscovery', () => {
  it('never lets an older response replace a newer origin', async () => {
    const pending: Record<string, (body: unknown) => void> = {};
    global.fetch = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise((resolve) => {
          const area = JSON.parse(String(init.body)).p_area_id as string;
          pending[area] = (body) => resolve({ ok: true, status: 200, text: async () => JSON.stringify(body) } as unknown as Response);
        }),
    ) as unknown as typeof fetch;

    const { result, rerender } = await renderHook(({ origin }: { origin: DiscoveryOrigin }) => useDiscovery(origin, filters), {
      initialProps: { origin: { source: 'area', areaId: 'wynwood' } as DiscoveryOrigin },
    });
    await waitFor(() => expect(pending.wynwood).toBeDefined());
    await rerender({ origin: { source: 'area', areaId: 'brickell' } });
    await waitFor(() => expect(pending.brickell).toBeDefined());

    await act(async () => pending.brickell(page('brickell')));
    await act(async () => pending.wynwood(page('wynwood')));
    expect(result.current.originLabel).toBe('brickell');
    expect(result.current.items.map((q) => q.id)).toEqual(['brickell']);
  });

  it('treats a malformed payload as an error instead of crashing', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ ok: true }) }) as unknown as Response) as unknown as typeof fetch;
    const { result } = await renderHook(() => useDiscovery({ source: 'area', areaId: 'wynwood' }, filters));
    await waitFor(() => expect(result.current.error).toBe('bad_response'));
    expect(result.current.items).toEqual([]);
  });
});
