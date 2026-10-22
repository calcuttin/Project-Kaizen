/** Serial start times with cancellation for both waiting and in-flight requests. */
export class RequestQueue {
  private tail = Promise.resolve();
  private nextStart = 0;
  private controllers = new Set<AbortController>();
  constructor(private interval = 1100) {}

  cancel() {
    for (const controller of this.controllers) controller.abort();
    this.controllers.clear();
    this.nextStart = 0;
  }

  async run<T>(allowed: () => boolean, request: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> {
    const controller = new AbortController();
    this.controllers.add(controller);
    const { signal } = controller;
    const slot = this.tail.then(async () => {
      if (signal.aborted || !allowed()) return;
      const delay = Math.max(0, this.nextStart - Date.now());
      if (delay) await new Promise<void>((resolve) => {
        const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); resolve(); };
        const timer = setTimeout(finish, delay);
        signal.addEventListener('abort', finish, { once: true });
      });
      if (!signal.aborted && allowed()) this.nextStart = Date.now() + this.interval;
    });
    this.tail = slot.catch(() => undefined);
    try {
      await slot;
      if (signal.aborted || !allowed()) return undefined;
      const result = await request(signal);
      return signal.aborted || !allowed() ? undefined : result;
    } catch (error) {
      if (!signal.aborted) throw error;
      return undefined;
    } finally { this.controllers.delete(controller); }
  }
}
