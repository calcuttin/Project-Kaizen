export type CsvBook = {
  title: string;
  author: string;
  isbn?: string;
  pages?: number;
  shelf?: string;
  status?: 'want' | 'reading' | 'finished' | 'paused';
  rating?: 1 | 2 | 3 | 4 | 5;
};

export type CsvPreview = { books: CsvBook[]; warnings: string[]; headers: string[] };

function rows(input: string): string[][] {
  const output: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted && char === '"' && input[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((value) => value.trim())) output.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) output.push(row);
  return output;
}

const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
const field = (record: Record<string, string>, ...names: string[]) => names.map(normalizeHeader).map((name) => record[name]).find((value) => value?.trim())?.trim();
const cleanIsbn = (value?: string) => value?.replace(/[^0-9X]/gi, '') || undefined;

export function parseBookCsv(text: string): CsvPreview {
  const parsed = rows(text.replace(/^\uFEFF/, ''));
  if (parsed.length < 2) return { books: [], warnings: ['The CSV has no book rows.'], headers: parsed[0] ?? [] };
  const headers = parsed[0];
  const keys = headers.map(normalizeHeader);
  const warnings: string[] = [];
  const books = parsed.slice(1).flatMap((cells, index) => {
    const record = Object.fromEntries(keys.map((key, i) => [key, cells[i] ?? '']));
    const title = field(record, 'title', 'book title');
    if (!title) { warnings.push(`Row ${index + 2} was skipped because it has no title.`); return []; }
    const rawStatus = field(record, 'status', 'exclusive shelf', 'bookshelves')?.toLowerCase() ?? '';
    const status: CsvBook['status'] = rawStatus.includes('read') && !rawStatus.includes('currently') && !rawStatus.includes('to-read') ? 'finished' : rawStatus.includes('currently') || rawStatus === 'reading' ? 'reading' : rawStatus.includes('paused') ? 'paused' : 'want';
    const pageValue = Number(field(record, 'pages', 'number of pages', 'numpages'));
    const ratingValue = Number(field(record, 'rating', 'my rating'));
    return [{
      title,
      author: field(record, 'author', 'authors', 'author l-f') ?? '',
      isbn: cleanIsbn(field(record, 'isbn13', 'isbn', 'asin')),
      pages: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : undefined,
      shelf: field(record, 'shelf', 'bookshelves', 'exclusive shelf'),
      status,
      rating: ratingValue >= 1 && ratingValue <= 5 ? ratingValue as CsvBook['rating'] : undefined,
    }];
  });
  return { books, warnings, headers };
}
