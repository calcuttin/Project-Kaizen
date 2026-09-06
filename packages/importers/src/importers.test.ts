import { describe, expect, it } from 'vitest';
import { parseBookCsv } from './csv';
import { parseKindleClippings } from './kindle';
import { bookMatches } from './matching';

describe('book CSV importer', () => {
  it('reads quoted fields and common Goodreads columns', () => {
    const result = parseBookCsv('Title,Author,ISBN13,Number of Pages,Exclusive Shelf\n"A, B",Writer,9781234567890,321,read');
    expect(result.books).toEqual([{ title: 'A, B', author: 'Writer', isbn: '9781234567890', pages: 321, shelf: 'read', status: 'finished', rating: undefined }]);
  });

  it('warns and skips rows without a title', () => {
    const result = parseBookCsv('Title,Author\n,Unknown');
    expect(result.books).toHaveLength(0);
    expect(result.warnings[0]).toContain('no title');
  });
});

describe('duplicate matching', () => {
  it('matches formatted ISBNs and normalized title/author pairs', () => {
    expect(bookMatches({ title: 'Different edition', isbn: '978-1-234-56789-0' }, { title: 'Anything', isbn: '9781234567890' })).toBe(true);
    expect(bookMatches({ title: 'The Book of Why', author: 'Judea Pearl' }, { title: 'the book of why!', author: 'JUDEA PEARL' })).toBe(true);
    expect(bookMatches({ title: 'The Book of Why', author: 'Judea Pearl' }, { title: 'The Book of Why', author: 'Someone Else' })).toBe(false);
  });
});

describe('Kindle clippings importer', () => {
  it('groups books and produces stable source references', () => {
    const text = `A Book (An Author)\n- Your Highlight on page 12 | Location 120-122 | Added on Monday, January 1, 2024 1:00:00 PM\n\nA useful idea.\n==========\nA Book (An Author)\n- Your Note on Location 123 | Added on Monday, January 1, 2024 1:01:00 PM\n\nRemember this.\n==========`;
    const first = parseKindleClippings(text);
    const second = parseKindleClippings(text);
    expect(first.books).toEqual([{ title: 'A Book', author: 'An Author', count: 2 }]);
    expect(first.clippings[0].page).toBe(12);
    expect(first.clippings.map((item) => item.sourceRef)).toEqual(second.clippings.map((item) => item.sourceRef));
  });
});
