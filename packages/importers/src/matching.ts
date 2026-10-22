export type MatchableBook = { title: string; author?: string; isbn?: string };

export const normalizeBookText = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const normalizeIsbn = (value?: string) => value?.replace(/[^0-9X]/gi, '');

export function bookMatches(candidate: MatchableBook, incoming: MatchableBook): boolean {
  const candidateIsbn = normalizeIsbn(candidate.isbn);
  const incomingIsbn = normalizeIsbn(incoming.isbn);
  if (candidateIsbn && incomingIsbn && candidateIsbn === incomingIsbn) return true;
  return normalizeBookText(candidate.title) === normalizeBookText(incoming.title)
    && (!candidate.author || !incoming.author || normalizeBookText(candidate.author) === normalizeBookText(incoming.author));
}

export function findBookMatch<T extends MatchableBook>(books: T[], incoming: MatchableBook): T | undefined {
  return books.find((candidate) => bookMatches(candidate, incoming));
}

/** Indexed equivalent of bookMatches, including books with unknown authors. */
export class BookMatchIndex<T extends MatchableBook> {
  private order = new Map<T, number>();
  private isbns = new Map<string, T>();
  private titles = new Map<string, { first: T; authors: Map<string, T>; unknown?: T }>();
  constructor(books: T[]) { books.forEach((book) => this.add(book)); }
  add(book: T) {
    if (!this.order.has(book)) this.order.set(book, this.order.size);
    const isbn = normalizeIsbn(book.isbn);
    if (isbn && !this.isbns.has(isbn)) this.isbns.set(isbn, book);
    const title = normalizeBookText(book.title);
    const group = this.titles.get(title) ?? { first: book, authors: new Map<string, T>() };
    if (!book.author) group.unknown ??= book;
    const author = normalizeBookText(book.author ?? '');
    if (!group.authors.has(author)) group.authors.set(author, book);
    this.titles.set(title, group);
  }
  find(book: MatchableBook): T | undefined {
    const isbn = normalizeIsbn(book.isbn);
    const group = this.titles.get(normalizeBookText(book.title));
    const matches = [isbn ? this.isbns.get(isbn) : undefined, !book.author ? group?.first : group?.unknown, book.author ? group?.authors.get(normalizeBookText(book.author)) : undefined].filter((value): value is T => value !== undefined);
    return matches.sort((a, b) => this.order.get(a)! - this.order.get(b)!)[0];
  }
}
