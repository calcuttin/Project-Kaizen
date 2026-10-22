import { expect, it, vi } from 'vitest';
import { RequestQueue } from './requestQueue';

it('aborts active requests and prevents queued transmission after opt-out', async () => {
  vi.useFakeTimers();
  try {
    const queue = new RequestQueue(1100);
    let allowed = true;
    let activeSignal: AbortSignal | undefined;
    const first = vi.fn((signal: AbortSignal) => {
      activeSignal = signal;
      return new Promise<string>((resolve) => signal.addEventListener('abort', () => resolve('late')));
    });
    const second = vi.fn(async () => 'second');
    const firstResult = queue.run(() => allowed, first);
    const secondResult = queue.run(() => allowed, second);
    await vi.advanceTimersByTimeAsync(0);
    expect(first).toHaveBeenCalledOnce();
    allowed = false; queue.cancel();
    await vi.runAllTimersAsync();
    expect(activeSignal?.aborted).toBe(true);
    expect(second).not.toHaveBeenCalled();
    expect(await firstResult).toBeUndefined();
    expect(await secondResult).toBeUndefined();
    allowed = true;
    expect(await queue.run(() => allowed, async () => 'new consent')).toBe('new consent');
  } finally { vi.useRealTimers(); }
});

it('rechecks owner/consent immediately before sending queued work', async () => {
  vi.useFakeTimers();
  try {
    const queue = new RequestQueue(1100);
    let owner = 'a';
    await queue.run(() => true, async () => 'first');
    const fetcher = vi.fn(async () => 'private');
    const result = queue.run(() => owner === 'a', fetcher);
    owner = 'b';
    await vi.runAllTimersAsync();
    expect(await result).toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
  } finally { vi.useRealTimers(); }
});
