import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { LocalRepository } from './repository';
import { queueSyncOperation, readOutbox, setSyncScope } from './sync/outbox';

describe('IndexedDB repository contract', () => {
  it('puts, filters, reads, and removes entities', async () => {
    const repository = new LocalRepository<{ id: string; kind: string; deletedAt?: string }>(`test-${crypto.randomUUID()}`);
    await repository.put({ id: 'one', kind: 'book' });
    await repository.put({ id: 'two', kind: 'note' });
    expect(await repository.get('one')).toEqual({ id: 'one', kind: 'book' });
    expect(await repository.list({ where: { kind: 'note' } })).toEqual([{ id: 'two', kind: 'note' }]);
    await repository.remove('one');
    expect(await repository.get('one')).toBeNull();
  });

  it('isolates offline mutation queues by account', async () => {
    const suffix = crypto.randomUUID();
    setSyncScope(`one-${suffix}`);
    await queueSyncOperation({ entityType: 'books', entityId: 'book-1', operation: 'put', payload: { id: 'book-1' } });
    expect(await readOutbox()).toHaveLength(1);
    setSyncScope(`two-${suffix}`);
    expect(await readOutbox()).toHaveLength(0);
    setSyncScope();
  });
});
