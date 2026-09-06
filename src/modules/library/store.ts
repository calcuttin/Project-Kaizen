import { createPersistedStore, registerStore } from '@/core/store';
import { newId, nowIso } from '@/core/ids';
import { todayKey } from '@/core/dates';
import type { BaseEntity, DateKey, ID } from '@/core/types';
import type { ShelfImport } from '@/data/bookshelf';
import type { ShelfTheme } from './themes';
import type { CabinetObjects } from './cabinet';

export type BookStatus = 'want' | 'reading' | 'finished' | 'paused';
export const BOOK_STATUS: Record<BookStatus, string> = { want: 'Want to read', reading: 'Reading', finished: 'Finished', paused: 'Paused' };

/** A shelf mirrors a real or virtual bookshelf (e.g. "Office — top shelf", "Kindle", "Business classics"). */
export interface Shelf extends BaseEntity { name: string; order: number; /** Genre theme that styles the shelf. */ theme?: ShelfTheme; objects?: CabinetObjects }

export interface Book extends BaseEntity {
  title: string;
  author: string;
  /** Optional ISBN for selecting the exact edition and its cover. */
  isbn?: string;
  pages: number;
  currentPage: number;
  status: BookStatus;
  shelfId?: ID;
  startedAt?: DateKey;
  finishedAt?: DateKey;
  rating?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  tags: string[];
  /** Two-color gradient seed for the generated cover. */
  hue: number;
  /** A verified cover served by Open Library, resolved from the title and author. */
  coverUrl?: string;
  /** Prevents repeated searches when Open Library has no confident match. */
  coverUnavailable?: boolean;
}

export interface ReadingSession { id: ID; bookId: ID; date: DateKey; pages: number }
export interface ReadingAnnotation extends BaseEntity {
  bookId: ID;
  kind: 'highlight' | 'note' | 'bookmark';
  content: string;
  location?: string;
  page?: number;
  annotatedAt?: string;
}

export interface ReadingGoal { year: number; books: number; pagesPerDay: number }

interface LibraryState {
  shelves: Record<ID, Shelf>;
  books: Record<ID, Book>;
  sessions: ReadingSession[];
  annotations: Record<ID, ReadingAnnotation>;
  goal: ReadingGoal;
  importedCollections: string[];
  /** Import a set of shelves + books (e.g. transcribed from photos). Idempotent by shelf name and book title. */
  importCollection: (collectionId: string, shelves: ShelfImport[]) => { shelves: number; books: number };
  addShelf: (name: string, theme?: ShelfTheme) => Shelf;
  renameShelf: (id: ID, name: string) => void;
  setShelfTheme: (id: ID, theme: ShelfTheme) => void;
  setShelfObjects: (id: ID, objects: CabinetObjects | undefined) => void;
  atmosphere: boolean;
  setAtmosphere: (enabled: boolean) => void;
  deleteShelf: (id: ID) => void;
  addBook: (b: Pick<Book, 'title' | 'author'> & Partial<Book>) => Book;
  updateBook: (id: ID, patch: Partial<Book>) => void;
  setBookCover: (id: ID, coverUrl: string | null) => void;
  deleteBook: (id: ID) => void;
  setStatus: (id: ID, status: BookStatus) => void;
  /** Log reading progress: sets currentPage and records a session for pace stats. */
  logProgress: (id: ID, toPage: number, date?: DateKey) => void;
  setGoal: (g: Partial<ReadingGoal>) => void;
  addAnnotation: (annotation: Omit<ReadingAnnotation, keyof BaseEntity> & Partial<BaseEntity>) => ReadingAnnotation;
  deleteAnnotation: (id: ID) => void;
}

export function migrateLibraryState(persisted: unknown, fromVersion: number) {
  const state = (persisted && typeof persisted === 'object' ? persisted : {}) as Partial<LibraryState>;
  if (fromVersion < 2) return { ...state, annotations: state.annotations ?? {} };
  return state;
}

export const useLibrary = createPersistedStore<LibraryState>('library', 2, (set, get) => ({
  shelves: {}, books: {}, sessions: [], annotations: {}, importedCollections: [],
  atmosphere: true,
  setAtmosphere: (atmosphere) => set({ atmosphere }),
  setShelfObjects: (id, objects) => set((s) => s.shelves[id] ? ({ shelves: { ...s.shelves, [id]: { ...s.shelves[id], objects, updatedAt: nowIso() } } }) : s),
  goal: { year: new Date().getFullYear(), books: 24, pagesPerDay: 20 },
  importCollection: (collectionId, shelves) => {
    let sc = 0, bc = 0;
    const titles = new Set(Object.values(get().books).map((b) => b.title.toLowerCase()));
    for (const sh of shelves) {
      let shelf = Object.values(get().shelves).find((x) => x.name.toLowerCase() === sh.shelf.toLowerCase());
      if (!shelf) { shelf = get().addShelf(sh.shelf, sh.theme); sc++; }
      else if (!shelf.theme && sh.theme) get().setShelfTheme(shelf.id, sh.theme);
      sh.books.forEach((b, i) => {
        if (titles.has(b.title.toLowerCase())) return;
        get().addBook({ title: b.title, author: b.author, pages: b.pages ?? 300, status: 'want', shelfId: shelf!.id, hue: (i * 47 + sh.shelf.length * 13) % 360 });
        titles.add(b.title.toLowerCase()); bc++;
      });
    }
    set((st) => ({ importedCollections: st.importedCollections.includes(collectionId) ? st.importedCollections : [...st.importedCollections, collectionId] }));
    return { shelves: sc, books: bc };
  },

  addShelf: (name, theme) => {
    const now = nowIso();
    const s: Shelf = { id: newId(), createdAt: now, updatedAt: now, name: name.trim(), order: Object.keys(get().shelves).length, theme };
    set((st) => ({ shelves: { ...st.shelves, [s.id]: s } }));
    return s;
  },
  setShelfTheme: (id, theme) => set((s) => ({ shelves: { ...s.shelves, [id]: { ...s.shelves[id], theme, updatedAt: nowIso() } } })),
  renameShelf: (id, name) => set((s) => ({ shelves: { ...s.shelves, [id]: { ...s.shelves[id], name, updatedAt: nowIso() } } })),
  deleteShelf: (id) => set((s) => {
    const { [id]: _, ...shelves } = s.shelves;
    const books = Object.fromEntries(Object.entries(s.books).map(([k, b]) => [k, b.shelfId === id ? { ...b, shelfId: undefined } : b]));
    return { shelves, books };
  }),

  addBook: (input) => {
    const now = nowIso();
    const b: Book = {
      id: newId(), createdAt: now, updatedAt: now, title: input.title.trim(), author: input.author.trim(), isbn: input.isbn?.trim() || undefined,
      pages: input.pages ?? 300, currentPage: input.currentPage ?? 0, status: input.status ?? 'want', shelfId: input.shelfId,
      startedAt: input.startedAt ?? (input.status === 'reading' ? todayKey() : undefined), finishedAt: input.finishedAt,
      rating: input.rating, notes: input.notes, tags: input.tags ?? [], hue: input.hue ?? Math.floor(Math.random() * 360),
      source: input.source, sourceRef: input.sourceRef, coverUrl: input.coverUrl, coverUnavailable: input.coverUnavailable,
    };
    set((s) => ({ books: { ...s.books, [b.id]: b } }));
    return b;
  },
  updateBook: (id, patch) => set((s) => {
    const current = s.books[id]; if (!current) return s;
    const cleanPatch = patch.isbn !== undefined ? { ...patch, isbn: patch.isbn.trim() || undefined } : patch;
    const identityChanged = (cleanPatch.title !== undefined && cleanPatch.title !== current.title) || (cleanPatch.author !== undefined && cleanPatch.author !== current.author) || (patch.isbn !== undefined && cleanPatch.isbn !== current.isbn);
    return { books: { ...s.books, [id]: { ...current, ...cleanPatch, ...(identityChanged ? { coverUrl: undefined, coverUnavailable: false } : {}), updatedAt: nowIso() } } };
  }),
  setBookCover: (id, coverUrl) => set((s) => s.books[id] ? ({ books: { ...s.books, [id]: { ...s.books[id], coverUrl: coverUrl ?? undefined, coverUnavailable: !coverUrl, updatedAt: nowIso() } } }) : s),
  deleteBook: (id) => set((s) => {
    const { [id]: _, ...books } = s.books;
    return { books, sessions: s.sessions.filter((x) => x.bookId !== id), annotations: Object.fromEntries(Object.entries(s.annotations).filter(([, item]) => item.bookId !== id)) };
  }),

  setStatus: (id, status) => {
    const b = get().books[id]; if (!b) return;
    const patch: Partial<Book> = { status };
    if (status === 'reading' && !b.startedAt) patch.startedAt = todayKey();
    if (status === 'finished') { patch.finishedAt = todayKey(); patch.currentPage = b.pages; }
    if (status === 'want') { patch.currentPage = 0; patch.startedAt = undefined; patch.finishedAt = undefined; }
    get().updateBook(id, patch);
  },

  logProgress: (id, toPage, date = todayKey()) => {
    const b = get().books[id]; if (!b) return;
    const clamped = Math.max(0, Math.min(b.pages, toPage));
    const delta = clamped - b.currentPage;
    const patch: Partial<Book> = { currentPage: clamped };
    if (b.status === 'want' && clamped > 0) { patch.status = 'reading'; patch.startedAt = date; }
    if (clamped >= b.pages && b.pages > 0) { patch.status = 'finished'; patch.finishedAt = date; }
    set((s) => ({
      books: { ...s.books, [id]: { ...b, ...patch, updatedAt: nowIso() } },
      sessions: delta > 0 ? [...s.sessions, { id: newId(), bookId: id, date, pages: delta }] : s.sessions,
    }));
  },

  setGoal: (g) => set((s) => ({ goal: { ...s.goal, ...g } })),
  addAnnotation: (input) => {
    const now = nowIso();
    const annotation: ReadingAnnotation = { ...input, id: input.id ?? newId(), createdAt: input.createdAt ?? now, updatedAt: input.updatedAt ?? now };
    set((s) => ({ annotations: { ...s.annotations, [annotation.id]: annotation } }));
    return annotation;
  },
  deleteAnnotation: (id) => set((s) => { const { [id]: _, ...annotations } = s.annotations; return { annotations }; }),
}), migrateLibraryState);
registerStore('library', useLibrary);

/* ── Derived ──────────────────────────────────────────── */
export const coverGradient = (hue: number) => `linear-gradient(150deg, hsl(${hue} 45% 42%), hsl(${(hue + 40) % 360} 55% 22%))`;

export function pagesInLastDays(sessions: ReadingSession[], days: number): number {
  const keys = new Set(Array.from({ length: days }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().slice(0, 10); }));
  return sessions.filter((s) => keys.has(s.date)).reduce((a, s) => a + s.pages, 0);
}

export function finishedThisYear(books: Book[], year: number): Book[] {
  return books.filter((b) => b.status === 'finished' && b.finishedAt?.startsWith(String(year)));
}
