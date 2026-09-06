/** Optional development fixture. Personal collections belong in browser imports, never source control. */
import type { ShelfTheme } from '@/modules/library/themes';

export interface ShelfImport { shelf: string; theme?: ShelfTheme; books: { title: string; author: string; pages?: number }[] }
export const BOOKSHELF_COLLECTION_ID = 'development-bookshelf-empty-v1';
export const BOOKSHELF: ShelfImport[] = [];
