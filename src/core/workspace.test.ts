import 'fake-indexeddb/auto';
import { get, set, clear } from 'idb-keyval';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(async () => { vi.resetModules(); vi.stubEnv('VITE_KAIZEN_MODE', 'cloud'); await clear(); });
afterEach(() => { vi.unstubAllEnvs(); });

async function loadWorkspace(owner: string) {
  // A fresh module graph represents the fresh document used for an account switch.
  vi.resetModules();
  const { createPersistedStore, openAccountWorkspace } = await import('./store');
  const store = createPersistedStore<{ records: string[] }>('test-records', 1, () => ({ records: [] }));
  await openAccountWorkspace(owner);
  return store;
}

describe('private account workspaces', () => {
  it('does not hydrate shared legacy data before or after authentication', async () => {
    await set('kaizen:test-records', JSON.stringify({ version: 1, state: { records: ['legacy private data'] } }));
    const { createPersistedStore, openAccountWorkspace } = await import('./store');
    const store = createPersistedStore<{ records: string[] }>('test-records', 1, () => ({ records: [] }));
    expect(store.persist.hasHydrated()).toBe(false);
    expect(store.getState().records).toEqual([]);
    await openAccountWorkspace('user_a');
    expect(store.getState().records).toEqual([]);
    expect(await get('kaizen:test-records')).toContain('legacy private data');
  });

  it('keeps A and B separate across reloads, including identical entity IDs', async () => {
    const a = await loadWorkspace('user_a');
    a.setState({ records: ['A private book'] });
    await vi.waitFor(async () => expect(await get('kaizen:account:user_a:test-records')).toContain('A private book'));
    const b = await loadWorkspace('user_b');
    expect(b.getState().records).toEqual([]);
    b.setState({ records: ['B private book'] });
    await vi.waitFor(async () => expect(await get('kaizen:account:user_b:test-records')).toContain('B private book'));
    expect((await loadWorkspace('user_a')).getState().records).toEqual(['A private book']);
  });

  it('rejects changing owners inside a live document and freezes storage on logout', async () => {
    const a = await loadWorkspace('user_a');
    const { openAccountWorkspace } = await import('./store');
    const { lockWorkspace } = await import('./storage');
    await expect(openAccountWorkspace('user_b')).rejects.toThrow('Reload required');
    lockWorkspace();
    a.setState({ records: ['late callback'] });
    expect(await get('kaizen:account:user_a:test-records')).toBeUndefined();
    expect(await get('kaizen:account:user_b:test-records')).toBeUndefined();
  });

  it('isolates repository storage and never adopts a legacy repository', async () => {
    await set('kaizen:repo:books', { same: { id: 'same', title: 'Legacy' } });
    await loadWorkspace('user_a');
    const { LocalRepository } = await import('./repository');
    const a = new LocalRepository<{ id: string; title: string }>('books');
    expect(await a.list()).toEqual([]);
    await a.put({ id: 'same', title: 'A' });
    await loadWorkspace('user_b');
    const { LocalRepository: OtherRepository } = await import('./repository');
    const b = new OtherRepository<{ id: string; title: string }>('books');
    expect(await b.list()).toEqual([]);
    await b.put({ id: 'same', title: 'B' });
    expect(await a.get('same')).toEqual({ id: 'same', title: 'A' });
    expect(await b.get('same')).toEqual({ id: 'same', title: 'B' });
  });
});
