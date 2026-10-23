import { afterEach, expect, it, vi } from 'vitest';
import { createRateLimitedFetch, RATE_LIMIT_CODE } from './rateLimitedFetch';
const api = 'https://example.supabase.co';
afterEach(() => vi.useRealTimers());
for (const header of ['90', new Date('2026-10-23T00:01:30Z').toUTCString()]) it(`honors Retry-After ${header}, suppresses repeat requests and then resumes`, async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-23T00:00:00Z'));
  const transport = vi.fn().mockResolvedValueOnce(new Response('busy', { status: 429, headers: { 'Retry-After': header } })).mockResolvedValue(new Response('[]'));
  const request = createRateLimitedFetch(api, transport);
  const response = await request(api + '/rest/v1/rpc/push_changes');
  expect(response.status).toBe(429); expect(await response.json()).toMatchObject({ code: RATE_LIMIT_CODE, details: String(Date.now() + 90_000) });
  await vi.advanceTimersByTimeAsync(89_999);
  expect((await request(api + '/rest/v1/tasks')).status).toBe(429); expect(transport).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1); expect((await request(api + '/rest/v1/tasks')).status).toBe(200); expect(transport).toHaveBeenCalledTimes(2);
});
it('uses a 60-second fallback for an absent or malformed delay', async () => {
  for (const value of [null, 'bad', '-5', '1.5']) {
    const transport = vi.fn().mockResolvedValue(new Response('', { status: 429, headers: value ? { 'Retry-After': value } : {} }));
    const now = Date.now(); const response = await createRateLimitedFetch(api, transport)(api + '/rest/v1/tasks');
    const body = await response.json(); expect(Number(body.details)).toBeGreaterThanOrEqual(now + 60_000);
  }
});
it('does not share cooldowns with a new session or unrelated endpoints and honors abort', async () => {
  const transport = vi.fn().mockImplementation(() => Promise.resolve(new Response('', { status: 429 })));
  const first = createRateLimitedFetch(api, transport), second = createRateLimitedFetch(api, transport);
  await first(api + '/rest/v1/tasks'); await second(api + '/rest/v1/tasks'); expect(transport).toHaveBeenCalledTimes(2);
  await first(api + '/functions/v1/delete-account'); await first('https://other.invalid/rest/v1/tasks'); expect(transport).toHaveBeenCalledTimes(4);
  const controller = new AbortController(); controller.abort();
  await expect(first(api + '/rest/v1/tasks', { signal: controller.signal })).rejects.toThrow(); expect(transport).toHaveBeenCalledTimes(4);
});
