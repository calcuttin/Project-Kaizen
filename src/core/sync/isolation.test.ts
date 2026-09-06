import 'fake-indexeddb/auto';
import { clear, set } from 'idb-keyval';
import { beforeEach, describe, expect, it } from 'vitest';
import { addConflict, clearSyncData, getSyncScope, queueSyncOperation, readConflicts, readOutbox, readSyncCursor, setSyncScope, writeSyncCursor } from './outbox';

beforeEach(async () => { await clear(); setSyncScope('user_a'); });

describe('sync account isolation', () => {
  it('captures the owner before waiting for pending writes', async () => {
    const write = queueSyncOperation({ entityId: 'a', entityType: 'books', operation: 'put' });
    const read = readOutbox();
    setSyncScope('user_b');
    await write;
    expect((await read).map((item) => item.entityId)).toEqual(['a']);
    expect(await readOutbox()).toEqual([]);
  });

  it('keeps late conflicts and cursor writes with their originating account', async () => {
    const owner = getSyncScope();
    setSyncScope('user_b');
    await addConflict({ id: 'conflict-a', entityId: 'a', entityType: 'books', local: {}, remote: { secret: 'A' }, detectedAt: 'now' }, owner);
    await writeSyncCursor(100, owner);
    expect(await readConflicts()).toEqual([]);
    expect(await readSyncCursor()).toBe(0);
    expect(await readConflicts(owner)).toHaveLength(1);
    expect(await readSyncCursor(owner)).toBe(100);
  });

  it('does not reuse cursors or queues associated with the legacy shared cache', async () => {
    await set('kaizen:sync:cursor:user_a', 999);
    await set('kaizen:sync:outbox:user_a', [{ payload: { secret: 'unassigned legacy data' } }]);
    expect(await readSyncCursor()).toBe(0);
    expect(await readOutbox()).toEqual([]);
  });

  it('clears only the requested account cache and queues', async () => {
    await writeSyncCursor(12, 'user_a');
    await writeSyncCursor(34, 'user_b');
    await queueSyncOperation({ entityId: 'b', entityType: 'books', operation: 'put' }, 'user_b');
    await clearSyncData('user_a');
    expect(await readSyncCursor('user_a')).toBe(0);
    expect(await readSyncCursor('user_b')).toBe(34);
    expect(await readOutbox('user_b')).toHaveLength(1);
  });
});
