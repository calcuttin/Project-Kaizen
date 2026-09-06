import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { migrateLibraryState } from './store';

describe('library store migration', () => {
  it('adds the annotation collection without changing existing books', () => {
    const books = { legacy: { id: 'legacy', title: 'Existing book' } };
    const migrated = migrateLibraryState({ books }, 1) as unknown as { books: typeof books; annotations: Record<string, unknown> };
    expect(migrated.books).toBe(books);
    expect(migrated.annotations).toEqual({});
  });
});
