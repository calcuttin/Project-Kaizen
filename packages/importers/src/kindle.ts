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
    const titleMatch = titleLine.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
    const title = (titleMatch?.[1] ?? titleLine).trim();
    const author = (titleMatch?.[2] ?? '').trim();
    const kind: KindleClipping['kind'] = /note/i.test(meta) ? 'note' : /bookmark/i.test(meta) ? 'bookmark' : 'highlight';
    const location = meta.match(/Location\s+([\d-]+)/i)?.[1];
    const page = Number(meta.match(/page\s+(\d+)/i)?.[1]);
    const dateText = meta.match(/Added on\s+(.+)$/i)?.[1];
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
