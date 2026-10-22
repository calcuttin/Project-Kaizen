import { expect, it } from 'vitest';
import { BookMatchIndex } from '@kaizen/importers';
import { MAX_IMPORT_BYTES, parseImport } from './importPreview';

it('rejects oversized and excessive-record imports before creating a preview', () => {
  expect(() => parseImport('csv', 'x'.repeat(MAX_IMPORT_BYTES + 1))).toThrow('5 MB');
  expect(() => parseImport('csv', 'title,author\n' + Array.from({ length: 1001 }, (_, i) => `Book ${i},Author`).join('\n'))).toThrow('1,000');
  expect(parseImport('csv', 'title,author\nExample,Author').data.books).toHaveLength(1);
});

it('deduplicates ISBN, normalized titles and unknown authors while indexing additions', () => {
  const index = new BookMatchIndex([{ title: 'The Book', author: 'A', isbn: '123-456' }]);
  expect(index.find({ title: 'Another title', isbn: '123456' })).toBeTruthy();
  expect(index.find({ title: 'THE BOOK!', author: 'a' })).toBeTruthy();
  expect(index.find({ title: 'The Book', author: 'B' })).toBeUndefined();
  expect(index.find({ title: 'The Book' })).toBeTruthy();
  index.add({ title: 'New', author: '', isbn: '' });
  expect(index.find({ title: 'New', author: 'Unknown' })).toBeTruthy();
});
