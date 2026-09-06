/**
 * Maps rows from the Notion "Reading List" database into Feed sources + items.
 *
 * Today the rows ship as a bundled JSON snapshot (src/data/notion-reading-list.json) pulled via the Notion
 * connector. The mapping is pure, so the same function will serve a live sync later — only the row provider changes.
 */
import type { ItemStatus, SourceKind } from './store';

export interface NotionReadingRow {
  url: string;            // Notion page URL — stable identity for dedupe
  createdTime: string;
  name: string;
  author: string | null;
  type: 'Book' | 'Article' | 'TV Series' | 'Film' | 'Podcast' | 'Academic Journal' | 'Essay Resource' | null;
  status: 'Not started' | 'In progress' | 'Done' | null;
  score: string | null;   // "⭐️⭐️⭐️⭐️⭐️" … "⭐️" | "TBD"
  link: string | null;
  completed: string | null;
}

export interface MappedSource { key: string; name: string; kind: SourceKind; url?: string }
export interface MappedItem { sourceKey: string; title: string; url?: string; status: ItemStatus; rating?: 1 | 2 | 3 | 4 | 5; completedAt?: string; notionUrl: string; createdAt: string; kindHint?: string }

const KNOWN: Record<string, { name: string; kind: SourceKind }> = {
  'youtube.com': { name: 'YouTube', kind: 'youtube' }, 'youtu.be': { name: 'YouTube', kind: 'youtube' },
  'linkedin.com': { name: 'LinkedIn', kind: 'blog' },
  'oneusefulthing.org': { name: 'One Useful Thing', kind: 'substack' },
  'substack.com': { name: 'Substack', kind: 'substack' },
  'anthropic.com': { name: 'Anthropic Engineering', kind: 'blog' }, 'transformer-circuits.pub': { name: 'Anthropic Research', kind: 'blog' }, 'claude.com': { name: 'Claude', kind: 'blog' },
  'changelog.com': { name: 'Changelog News', kind: 'podcast' },
  'github.com': { name: 'GitHub', kind: 'blog' },
  'automateyournetwork.ca': { name: 'Automate Your Network', kind: 'blog' },
  'cloudsecurityalliance.org': { name: 'Cloud Security Alliance', kind: 'blog' },
  'simonwillison.net': { name: 'Simon Willison', kind: 'blog' },
  'nytimes.com': { name: 'The New York Times', kind: 'newsletter' },
  'blog.langchain.com': { name: 'LangChain Blog', kind: 'blog' },
  'huggingface.co': { name: 'Hugging Face', kind: 'blog' },
  'cursor.com': { name: 'Cursor Blog', kind: 'blog' },
  'wcollins.io': { name: 'William Collins', kind: 'blog' },
  'developers.openai.com': { name: 'OpenAI Developers', kind: 'blog' },
  'informingscience.org': { name: 'Informing Science', kind: 'blog' },
  'dora.dev': { name: 'DORA', kind: 'blog' },
  'semgrep.dev': { name: 'Semgrep', kind: 'blog' },
  'blog.google': { name: 'Google Blog', kind: 'blog' },
  'cloud.google.com': { name: 'Google Cloud', kind: 'blog' },
  'ibm.com': { name: 'IBM Think', kind: 'blog' },
  'machinelearningmastery.com': { name: 'Machine Learning Mastery', kind: 'blog' },
  'manus.im': { name: 'Manus', kind: 'blog' },
  'engineering.linkedin.com': { name: 'LinkedIn Engineering', kind: 'blog' },
};

function hostOf(link: string | null): string | null {
  if (!link) return null;
  try { return new URL(link).hostname.replace(/^(www|m)\./, ''); } catch { return null; }
}

function sourceFor(link: string | null, type: NotionReadingRow['type']): MappedSource {
  const host = hostOf(link);
  if (!host) return { key: 'notion-misc', name: 'Reading list (no link)', kind: 'blog' };
  const exact = KNOWN[host];
  if (exact) return { key: host, ...exact, url: `https://${host}` };
  const sub = host.match(/^([^.]+)\.substack\.com$/);
  if (sub) return { key: host, name: `${sub[1]} · Substack`, kind: 'substack', url: `https://${host}` };
  const root = host.split('.').slice(-2).join('.');
  if (KNOWN[root]) return { key: root, ...KNOWN[root], url: `https://${root}` };
  const pretty = root.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return { key: root, name: pretty, kind: type === 'Podcast' ? 'podcast' : 'blog', url: `https://${root}` };
}

export function cleanTitle(name: string): string {
  let t = name.replace(/^\(\d+\)\s*/, '').replace(/\s*[-|–·]\s*(YouTube|LinkedIn)\s*$/i, '').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
  if (/^https?:\/\//.test(t)) t = `Link · ${hostOf(t) ?? 'untitled'}`;
  if (t.length > 140) t = t.slice(0, 120).trimEnd() + '…';
  return t;
}

const STATUS: Record<string, ItemStatus> = { 'Not started': 'queued', 'In progress': 'in-progress', 'Done': 'done' };

export function mapNotionRows(rows: NotionReadingRow[]): { sources: MappedSource[]; items: MappedItem[]; books: NotionReadingRow[] } {
  const sources = new Map<string, MappedSource>();
  const items: MappedItem[] = [];
  const books: NotionReadingRow[] = [];
  for (const r of rows) {
    if (r.type === 'Book') { books.push(r); continue; }
    const s = sourceFor(r.link, r.type);
    if (!sources.has(s.key)) sources.set(s.key, s);
    const stars = r.score && r.score !== 'TBD' ? (r.score.match(/⭐️/g)?.length ?? 0) : 0;
    items.push({
      sourceKey: s.key, title: cleanTitle(r.name), url: r.link ?? undefined, status: STATUS[r.status ?? ''] ?? 'queued',
      rating: stars >= 1 && stars <= 5 ? (stars as 1 | 2 | 3 | 4 | 5) : undefined,
      completedAt: r.completed ?? undefined, notionUrl: r.url, createdAt: r.createdTime, kindHint: r.type ?? undefined,
    });
  }
  return { sources: [...sources.values()], items, books };
}
