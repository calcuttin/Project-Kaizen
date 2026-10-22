import { parseBookCsv, parseKindleClippings, type CsvPreview, type KindlePreview } from '@kaizen/importers';
export type ImportKind = 'csv' | 'kindle';
export type ImportPreview = { kind: 'csv'; data: CsvPreview } | { kind: 'kindle'; data: KindlePreview };
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_RECORDS = 1000;
export function parseImport(kind: ImportKind, text: string): ImportPreview {
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) throw new Error('Choose a file smaller than 5 MB.');
  const preview: ImportPreview = kind === 'csv' ? { kind, data: parseBookCsv(text) } : { kind, data: parseKindleClippings(text) };
  const count = preview.kind === 'csv' ? preview.data.books.length : preview.data.clippings.length;
  if (count > MAX_IMPORT_RECORDS) throw new Error('Import up to 1,000 records at a time. Split this file into smaller files.');
  return preview;
}
