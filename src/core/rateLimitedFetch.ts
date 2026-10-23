export const RATE_LIMIT_CODE = 'KAIZEN_RATE_LIMITED';
const fallbackDelay = 60_000;

function retryDeadline(value: string | null, now: number) {
  if (value && /^\d+$/.test(value.trim())) {
    const deadline = now + Number(value) * 1000;
    if (Number.isSafeInteger(deadline)) return Math.max(now + 1000, deadline);
  }
  const date = value && !/^[\d.+-]+$/.test(value.trim()) ? Date.parse(value) : NaN;
  return Number.isFinite(date) && date > now ? date : now + fallbackDelay;
}

/** A client/session-local cooldown, not server-side abuse prevention. */
export function createRateLimitedFetch(apiUrl: string, transport: typeof fetch = fetch): typeof fetch {
  const origin = new URL(apiUrl).origin;
  let retryAt = 0;
  const limited = () => new Response(JSON.stringify({
    code: RATE_LIMIT_CODE, message: 'Cloud saving is paused while the server is busy. Changes remain on this device.',
    details: String(retryAt), hint: 'Retry automatically after the cooldown.',
  }), { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.max(1, Math.ceil((retryAt - Date.now()) / 1000))) } });
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const dataRequest = url.origin === origin && url.pathname.startsWith('/rest/v1/');
    const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    signal?.throwIfAborted();
    if (dataRequest && Date.now() < retryAt) return limited();
    const response = await transport(input, init);
    if (!dataRequest || response.status !== 429) return response;
    retryAt = Math.max(retryAt, retryDeadline(response.headers.get('Retry-After'), Date.now()));
    // Release the original body; only a sanitized, stable error reaches the UI.
    await response.body?.cancel();
    return limited();
  };
}
