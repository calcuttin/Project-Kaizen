export type KindleClipping = {
  sourceRef: string;
  title: string;
  author: string;
  kind: 'highlight' | 'note' | 'bookmark';
  content: string;
  location?: string;
  page?: number;
  annotatedAt?: string;
};

export type KindlePreview = { clippings: KindleClipping[]; books: { title: string; author: string; count: number }[]; warnings: string[] };

function fingerprint(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return `kindle-${(hash >>> 0).toString(16)}`;
}

export function parseKindleClippings(text: string): KindlePreview {
  const warnings: string[] = [];
  const clippings = text.replace(/^\uFEFF/, '').split(/^==========\s*$/m).flatMap((block, index) => {
    const lines = block.split(/\r?\n/).map((line) => line.trim());
    while (lines.length && !lines[0]) lines.shift();
    const titleLine = lines[0];
    const meta = lines[1];
    if (!titleLine || !meta) return [];
    // Split the final author suffix without backtracking across an arbitrary title.
    const authorStart = titleLine.lastIndexOf('(');
    const authorCandidate = titleLine.slice(authorStart + 1, -1);
    const hasAuthor = titleLine.endsWith(')') && authorStart >= 0 && !authorCandidate.includes(')');
    const title = (hasAuthor ? titleLine.slice(0, authorStart) : titleLine).trim();
    const author = hasAuthor ? authorCandidate.trim() : '';
    const kind: KindleClipping['kind'] = /note/i.test(meta) ? 'note' : /bookmark/i.test(meta) ? 'bookmark' : 'highlight';
    const location = meta.match(/Location\s+([\d-]+)/i)?.[1];
    const page = Number(meta.match(/page\s+(\d+)/i)?.[1]);
    const dateMarker = 'added on';
    const dateStart = meta.toLowerCase().indexOf(dateMarker);
    const dateSuffix = dateStart < 0 ? '' : meta.slice(dateStart + dateMarker.length);
    const dateText = dateSuffix[0]?.trim() === '' ? dateSuffix.trim() : undefined;
    const parsedDate = dateText ? new Date(dateText) : null;
    const content = lines.slice(2).filter(Boolean).join('\n').trim();
    if (kind !== 'bookmark' && !content) { warnings.push(`Clipping ${index + 1} was skipped because it was empty.`); return []; }
    const canonical = `${title}\n${author}\n${kind}\n${location ?? ''}\n${content}`;
    return [{ sourceRef: fingerprint(canonical), title, author, kind, content, location, page: Number.isFinite(page) && page > 0 ? page : undefined, annotatedAt: parsedDate && !Number.isNaN(parsedDate.valueOf()) ? parsedDate.toISOString() : undefined }];
  });
  const grouped = new Map<string, { title: string; author: string; count: number }>();
  for (const clipping of clippings) {
    const key = `${clipping.title.toLowerCase()}|${clipping.author.toLowerCase()}`;
    const current = grouped.get(key);
    grouped.set(key, current ? { ...current, count: current.count + 1 } : { title: clipping.title, author: clipping.author, count: 1 });
  }
  return { clippings, books: [...grouped.values()], warnings };
}
