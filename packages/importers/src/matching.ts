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
