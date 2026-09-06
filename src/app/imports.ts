/**
 * Bundled data collections that are imported into the local stores once.
 * Each collection has a stable id; stores remember which ids they've already applied.
 */
import { whenHydrated } from '@/core/store';
import { BOOKSHELF, BOOKSHELF_COLLECTION_ID } from '@/data/bookshelf';
import notion from '@/data/notion-reading-list.json';
import { useLibrary } from '@/modules/library/store';
import { useFeed } from '@/modules/feed/store';
import type { NotionReadingRow } from '@/modules/feed/notionImport';

export const NOTION_COLLECTION_ID = `notion-reading-list-${notion.exportedAt}`;

export async function runBundledImports(): Promise<{ books: number; items: number }> {
  await Promise.all([whenHydrated(useLibrary), whenHydrated(useFeed)]);
  let books = 0, items = 0;
  const lib = useLibrary.getState();
  if (!lib.importedCollections.includes(BOOKSHELF_COLLECTION_ID)) books = lib.importCollection(BOOKSHELF_COLLECTION_ID, BOOKSHELF).books;
  const feed = useFeed.getState();
  if (!feed.importedCollections.includes(NOTION_COLLECTION_ID)) items = feed.importNotion(NOTION_COLLECTION_ID, notion.rows as NotionReadingRow[]).items;
  return { books, items };
}

/** Force a re-run (e.g. from Settings) — safe because both importers are idempotent. */
export function reimportAll(): { books: number; items: number } {
  const books = useLibrary.getState().importCollection(BOOKSHELF_COLLECTION_ID, BOOKSHELF).books;
  const items = useFeed.getState().importNotion(NOTION_COLLECTION_ID, notion.rows as NotionReadingRow[]).items;
  return { books, items };
}

