import { parseScanPayload } from '../../src/features/quest-loop/scanCode';

const ORIGIN = 'https://miamisidequests.io';

describe('parseScanPayload', () => {
  it('accepts the site origin and its www variant, case-insensitively normalising the code', () => {
    expect(parseScanPayload('https://miamisidequests.io/scan/ABCD1234', ORIGIN)).toBe('ABCD1234');
    expect(parseScanPayload('https://www.miamisidequests.io/scan/abcd1234', ORIGIN)).toBe('ABCD1234');
    expect(parseScanPayload('  https://MIAMISIDEQUESTS.io/scan/9f8e7d6c  ', ORIGIN)).toBe('9F8E7D6C');
  });

  it('works when the configured origin itself has www', () => {
    expect(parseScanPayload('https://miamisidequests.io/scan/ABCD1234', 'https://www.miamisidequests.io')).toBe('ABCD1234');
  });

  it.each([
    ['other host', 'https://evil.example/scan/ABCD1234'],
    ['look-alike host', 'https://miamisidequests.io.evil.example/scan/ABCD1234'],
    ['subdomain', 'https://app.miamisidequests.io/scan/ABCD1234'],
    ['http', 'http://miamisidequests.io/scan/ABCD1234'],
    ['extra path', 'https://miamisidequests.io/scan/ABCD1234/extra'],
    ['prefix path', 'https://miamisidequests.io/x/scan/ABCD1234'],
    ['wrong route', 'https://miamisidequests.io/q/ABCD1234'],
    ['query string', 'https://miamisidequests.io/scan/ABCD1234?next=https://evil.example'],
    ['fragment', 'https://miamisidequests.io/scan/ABCD1234#x'],
    ['credentials', 'https://user:pw@miamisidequests.io/scan/ABCD1234'],
    ['port', 'https://miamisidequests.io:8443/scan/ABCD1234'],
    ['javascript:', 'javascript:alert(1)'],
    ['bare code (decision: rejected, only full URLs are printed)', 'ABCD1234'],
    ['code too short', 'https://miamisidequests.io/scan/AB1'],
    ['code with symbols', 'https://miamisidequests.io/scan/AB-CD_12'],
    ['empty', ''],
    ['non-string', 42],
  ])('rejects %s', (_label, payload) => {
    expect(parseScanPayload(payload as string, ORIGIN)).toBeNull();
  });
});
