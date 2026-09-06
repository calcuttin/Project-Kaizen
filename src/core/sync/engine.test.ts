import 'fake-indexeddb/auto';
import { clear } from 'idb-keyval';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queueSyncOperation, readConflicts, readOutbox, readSyncCursor, setSyncScope } from './outbox';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), apply: vi.fn(), watch: vi.fn(() => vi.fn()) }));
vi.mock('@/core/supabase', () => ({ getSupabaseClient: () => ({ rpc: mocks.rpc }) }));
vi.mock('@/core/device', () => ({ getDeviceId: () => 'test-device' }));
vi.mock('./storeBridge', () => ({ applyRemoteChanges: mocks.apply, watchStoresForSync: mocks.watch }));
import { startCloudSync, stopCloudSync, syncNow, useSyncStatus } from './engine';

beforeEach(async () => {
  await clear(); vi.clearAllMocks();
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn(), setInterval: vi.fn(), clearInterval: vi.fn() });
  vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn(), visibilityState: 'visible' });
});
afterEach(() => { stopCloudSync(); vi.unstubAllGlobals(); });

describe('sync lifecycle isolation', () => {
  it('discards a late A download after B starts, even if abort is ignored by the transport', async () => {
    let finishA!: (value: unknown) => void;
    const responseA = new Promise((resolve) => { finishA = resolve; });
    let signalA!: AbortSignal;
    mocks.rpc.mockImplementationOnce(() => ({ abortSignal: (signal: AbortSignal) => { signalA = signal; return responseA; } }));
    setSyncScope('user_a');
    const stopA = startCloudSync();
    const pendingA = syncNow();
    await vi.waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('pull_changes', { p_after_seq: 0 }));
    stopA();
    expect(signalA.aborted).toBe(true);
    mocks.rpc.mockImplementation(() => ({ abortSignal: () => Promise.resolve({ data: [], error: null }) }));
    setSyncScope('user_b');
    const stopB = startCloudSync();
    try {
      await syncNow();
      finishA({ data: [{ seq: 99, entity_type: 'books', entity_id: 'a', operation: 'put', payload: { title: 'A private' }, revision: 1 }], error: null });
      await pendingA;
      expect(mocks.apply.mock.calls).toEqual([[[]]]);
      expect(await readSyncCursor('user_b')).toBe(0);
      expect(await readSyncCursor('user_a')).toBe(0);
    } finally { stopB(); }
  });

  it('does not move an in-flight upload or its conflict into a new account', async () => {
    let finishA!: (value: unknown) => void;
    const responseA = new Promise((resolve) => { finishA = resolve; });
    mocks.rpc.mockImplementationOnce(() => ({ abortSignal: () => responseA }));
    setSyncScope('user_a');
    const mutation = await queueSyncOperation({ entityId: 'a', entityType: 'books', operation: 'put', payload: { title: 'A private' } });
    const stopA = startCloudSync();
    const pendingA = syncNow();
    await vi.waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1));
    stopA();
    setSyncScope('user_b');
    finishA({ data: [{ mutation_id: mutation.mutationId, status: 'conflict', remote_payload: { title: 'A remote' } }], error: null });
    await pendingA;
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(await readOutbox('user_a')).toHaveLength(1);
    expect(await readOutbox('user_b')).toEqual([]);
    expect(await readConflicts('user_b')).toEqual([]);
  });
});

it('marks new edits pending immediately and uploads automatically after the debounce', async () => {
  mocks.rpc.mockImplementation((name, args) => ({ abortSignal: () => Promise.resolve({ error: null, data: name === 'push_changes' ? args.p_mutations.map((item: { mutationId: string }) => ({ mutation_id: item.mutationId, status: 'applied' })) : [] }) }));
  setSyncScope('autosave'); startCloudSync(); await syncNow();
  expect(useSyncStatus.getState().status).toBe('idle');
  const write = queueSyncOperation({ entityId: 'one', entityType: 'tasks', operation: 'put', payload: { title: 'New edit' } });
  expect(useSyncStatus.getState().writing).toBe(1);
  await write;
  await vi.waitFor(() => expect(useSyncStatus.getState().pending).toBe(1));
  await vi.waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('push_changes', expect.anything()), { timeout: 1800 });
  await vi.waitFor(() => expect(useSyncStatus.getState().pending).toBe(0));
});

it('keeps edits made during an in-flight download instead of overwriting them', async () => {
  let finish!: (value: unknown) => void;
  mocks.rpc.mockImplementation(() => ({ abortSignal: () => new Promise((resolve) => { finish = resolve; }) }));
  setSyncScope('concurrent'); startCloudSync(); const saving = syncNow();
  await vi.waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1));
  await queueSyncOperation({ entityId: 'one', entityType: 'tasks', operation: 'put', payload: { title: 'Local edit' } });
  finish({ error: null, data: [{ seq: 1, entity_type: 'tasks', entity_id: 'one', operation: 'put', payload: { title: 'Older version' }, revision: 1 }] });
  await saving;
  expect(mocks.apply).toHaveBeenCalledWith([]);
  expect((await readOutbox('concurrent'))[0].payload).toEqual({ title: 'Local edit' });
  expect(useSyncStatus.getState().pending).toBe(1);
});
