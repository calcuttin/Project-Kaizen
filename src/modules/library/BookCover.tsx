import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { coverGradient, useLibrary, type Book } from './store';
import { useUI } from '@/app/uiStore';

type SearchDoc = { title?: string; author_name?: string[]; cover_i?: number; number_of_pages_median?: number };
type CoverResult = string | null | undefined;
export type BookMetadata = { title?: string; author?: string; pages?: number };

const requests = new Map<string, Promise<CoverResult>>();
const metadataRequests = new Map<string, Promise<BookMetadata | null>>();
let nextRequestAt = 0;
let searchQueue = Promise.resolve();

const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const cleanIsbn = (isbn?: string) => {
  const value = isbn?.replace(/[^0-9x]/gi, '').toUpperCase();
  return value && (value.length === 10 || value.length === 13) ? value : undefined;
};
const isbnCoverUrl = (isbn?: string) => {
  const value = cleanIsbn(isbn);
  return value ? `https://covers.openlibrary.org/b/isbn/${value}-M.jpg?default=false` : undefined;
};

/** Retrieves book metadata only after the reader explicitly requests an ISBN lookup. */
export async function lookupOpenLibraryBook(isbn: string): Promise<BookMetadata | null> {
  const clean = cleanIsbn(isbn);
  if (!clean) return null;
  if (metadataRequests.has(clean)) return metadataRequests.get(clean)!;
  const request = fetch(`https://openlibrary.org/search.json?${new URLSearchParams({ isbn: clean, limit: '1', fields: 'title,author_name,number_of_pages_median' })}`)
    .then(async (response) => {
      if (!response.ok) return null;
      const records = await response.json() as { docs?: SearchDoc[] };
      const record = records.docs?.[0];
      if (!record) return null;
      const author = record.author_name?.filter(Boolean).join(', ');
      return { title: record.title, author: author || undefined, pages: record.number_of_pages_median };
    })
    .catch(() => null);
  metadataRequests.set(clean, request);
  return request;
}

async function waitForSearchSlot() {
  const slot = searchQueue.then(async () => {
    const delay = Math.max(0, nextRequestAt - Date.now());
    if (delay) await new Promise<void>((resolve) => window.setTimeout(resolve, delay));
    nextRequestAt = Date.now() + 1100;
  });
  searchQueue = slot.catch(() => undefined);
  await slot;
}

async function resolveOpenLibraryCover(title: string, author: string): Promise<CoverResult> {
  const key = `${normalize(title)}|${normalize(author)}`;
  if (requests.has(key)) return requests.get(key)!;
  const request = (async () => {
    await waitForSearchSlot();
    try {
      const query = new URLSearchParams({ title, author, limit: '5', fields: 'title,author_name,cover_i' });
      const response = await fetch(`https://openlibrary.org/search.json?${query}`);
      if (!response.ok) return undefined;
      const payload = await response.json() as { docs?: SearchDoc[] };
      const titleKey = normalize(title);
      const surname = normalize(author).split(' ').filter(Boolean).at(-1) ?? '';
      const candidate = payload.docs?.find((doc) => doc.cover_i && normalize(doc.title ?? '') === titleKey && (!surname || doc.author_name?.some((name) => normalize(name).includes(surname))))
        ?? payload.docs?.find((doc) => doc.cover_i && normalize(doc.title ?? '') === titleKey);
      return candidate?.cover_i ? `https://covers.openlibrary.org/b/id/${candidate.cover_i}-M.jpg?default=false` : null;
    } catch {
      return undefined;
    }
  })();
  requests.set(key, request);
  return request;
}

function resolveCover(book: Book): Promise<CoverResult> {
  return Promise.resolve(isbnCoverUrl(book.isbn) ?? resolveOpenLibraryCover(book.title, book.author));
}

export function BookCover({ book, className = 'cover', style, children }: { book: Book; className?: string; style?: CSSProperties; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const externalBookCovers = useUI((state) => state.externalBookCovers);
  const setBookCover = useLibrary((state) => state.setBookCover);

  useEffect(() => {
    const element = ref.current; if (!element || visible) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, { rootMargin: '320px' });
    observer.observe(element); return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!externalBookCovers || !visible || book.coverUrl || book.coverUnavailable) return;
    let cancelled = false;
    resolveCover(book).then((url) => {
      if (!cancelled && url !== undefined) setBookCover(book.id, url);
    });
    return () => { cancelled = true; };
  }, [book.author, book.coverUnavailable, book.coverUrl, book.id, book.isbn, book.title, externalBookCovers, setBookCover, visible]);

  useEffect(() => { setFailed(false); }, [book.coverUrl]);

  const image = Boolean(externalBookCovers && book.coverUrl && /^https:\/\//i.test(book.coverUrl) && !failed);
  return <div ref={ref} className={`${className}${image ? ' has-art' : ''}`} style={{ '--cover': coverGradient(book.hue), ...style } as CSSProperties}>
    {image ? <img src={book.coverUrl} alt={`Cover of ${book.title}`} loading="lazy" referrerPolicy="no-referrer" onError={() => {
      setFailed(true);
      if (isbnCoverUrl(book.isbn)) {
        resolveOpenLibraryCover(book.title, book.author).then((url) => setBookCover(book.id, url ?? null));
      } else setBookCover(book.id, null);
    }} /> : children}
  </div>;
}
