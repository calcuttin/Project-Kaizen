import { createPersistedStore, registerStore } from '@/core/store';
import { newId, nowIso } from '@/core/ids';
import type { BaseEntity, Domain, ID } from '@/core/types';
import { mapNotionRows, type NotionReadingRow } from './notionImport';

export type SourceKind = 'podcast' | 'substack' | 'newsletter' | 'youtube' | 'blog';
export const SOURCE_KIND: Record<SourceKind, string> = { podcast: 'Podcast', substack: 'Substack', newsletter: 'Newsletter', youtube: 'YouTube', blog: 'Blog' };

export interface Source extends BaseEntity {
  name: string;
  kind: SourceKind;
  url?: string;
  domain?: Domain;
  color: string;
  archived?: boolean;
  /** Stable identity for imported sources (e.g. hostname). */
  key?: string;
}

export type ItemStatus = 'queued' | 'in-progress' | 'done' | 'skipped';

/** An episode, issue, or post from a source. */
export interface FeedItem extends BaseEntity {
  sourceId: ID;
  title: string;
  url?: string;
  status: ItemStatus;
  /** Minutes for podcasts/videos; estimated reading minutes for text. */
  durationMin?: number;
  progressMin?: number;
  /** The one thing worth remembering. Captured on completion. */
  takeaway?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  completedAt?: string;
  pinned?: boolean;
  /** Back-link to the Notion page this item was imported from. */
  notionUrl?: string;
  /** Notion 'Type' (Article, Podcast, Academic Journal…). */
  kindHint?: string;
}

interface FeedState {
  sources: Record<ID, Source>;
  items: Record<ID, FeedItem>;
  importedCollections: string[];
  /** Import Notion reading-list rows. Idempotent: matches sources by key and items by notionUrl. Returns counts. */
  importNotion: (collectionId: string, rows: NotionReadingRow[]) => { sources: number; items: number; updated: number };
  addSource: (s: Pick<Source, 'name' | 'kind'> & Partial<Source>) => Source;
  updateSource: (id: ID, patch: Partial<Source>) => void;
  deleteSource: (id: ID) => void;
  addItem: (i: Pick<FeedItem, 'sourceId' | 'title'> & Partial<FeedItem>) => FeedItem;
  updateItem: (id: ID, patch: Partial<FeedItem>) => void;
  deleteItem: (id: ID) => void;
  setProgress: (id: ID, minutes: number) => void;
  complete: (id: ID, takeaway?: string, rating?: FeedItem['rating']) => void;
}

const COLORS = ['#7dcfff', '#bb9af7', '#f7768e', '#9ece6a', '#e0af68', '#ff9e64', '#73daca', '#7aa2f7'];

export const useFeed = createPersistedStore<FeedState>('feed', 1, (set, get) => ({
  sources: {}, items: {}, importedCollections: [],
  importNotion: (collectionId, rows) => {
    const mapped = mapNotionRows(rows);
    let sCount = 0, iCount = 0, uCount = 0;
    const keyToId = new Map<string, ID>();
    for (const src of Object.values(get().sources)) if (src.key) keyToId.set(src.key, src.id);
    for (const ms of mapped.sources) {
      if (keyToId.has(ms.key)) continue;
      const created = get().addSource({ name: ms.name, kind: ms.kind, url: ms.url, key: ms.key });
      keyToId.set(ms.key, created.id); sCount++;
    }
    const byNotion = new Map<string, FeedItem>();
    for (const it of Object.values(get().items)) if (it.notionUrl) byNotion.set(it.notionUrl, it);
    for (const mi of mapped.items) {
      const sourceId = keyToId.get(mi.sourceKey); if (!sourceId) continue;
      const existing = byNotion.get(mi.notionUrl);
      if (existing) {
        // Notion is the system of record for status only while the item hasn't been touched locally.
        if (existing.status === 'queued' && mi.status !== 'queued') { get().updateItem(existing.id, { status: mi.status, completedAt: mi.completedAt, rating: mi.rating ?? existing.rating }); uCount++; }
        continue;
      }
      const item = get().addItem({ sourceId, title: mi.title, url: mi.url, status: mi.status, rating: mi.rating, completedAt: mi.completedAt, notionUrl: mi.notionUrl, kindHint: mi.kindHint });
      set((st) => ({ items: { ...st.items, [item.id]: { ...st.items[item.id], createdAt: mi.createdAt } } }));
      iCount++;
    }
    set((st) => ({ importedCollections: st.importedCollections.includes(collectionId) ? st.importedCollections : [...st.importedCollections, collectionId] }));
    return { sources: sCount, items: iCount, updated: uCount };
  },
  addSource: (input) => {
    const now = nowIso();
    const s: Source = { id: newId(), createdAt: now, updatedAt: now, name: input.name.trim(), kind: input.kind, url: input.url, domain: input.domain, key: input.key, color: input.color ?? COLORS[Object.keys(get().sources).length % COLORS.length] };
    set((st) => ({ sources: { ...st.sources, [s.id]: s } }));
    return s;
  },
  updateSource: (id, patch) => set((s) => ({ sources: { ...s.sources, [id]: { ...s.sources[id], ...patch, updatedAt: nowIso() } } })),
  deleteSource: (id) => set((s) => {
    const { [id]: _, ...sources } = s.sources;
    const items = Object.fromEntries(Object.entries(s.items).filter(([, i]) => i.sourceId !== id));
    return { sources, items };
  }),
  addItem: (input) => {
    const now = nowIso();
    const i: FeedItem = { id: newId(), createdAt: now, updatedAt: now, sourceId: input.sourceId, title: input.title.trim(), url: input.url, status: input.status ?? 'queued', durationMin: input.durationMin, progressMin: input.progressMin ?? 0, takeaway: input.takeaway, rating: input.rating, pinned: input.pinned, completedAt: input.completedAt, notionUrl: input.notionUrl, kindHint: input.kindHint };
    set((s) => ({ items: { ...s.items, [i.id]: i } }));
    return i;
  },
  updateItem: (id, patch) => set((s) => ({ items: { ...s.items, [id]: { ...s.items[id], ...patch, updatedAt: nowIso() } } })),
  deleteItem: (id) => set((s) => { const { [id]: _, ...items } = s.items; return { items }; }),
  setProgress: (id, minutes) => {
    const it = get().items[id]; if (!it) return;
    const m = Math.max(0, minutes);
    if (it.durationMin && m >= it.durationMin) get().complete(id);
    else get().updateItem(id, { progressMin: m, status: m > 0 ? 'in-progress' : 'queued' });
  },
  complete: (id, takeaway, rating) => {
    const it = get().items[id]; if (!it) return;
    const completedAt = nowIso();
    get().updateItem(id, { status: 'done', completedAt, progressMin: it.durationMin ?? it.progressMin, ...(takeaway !== undefined ? { takeaway } : {}), ...(rating ? { rating } : {}) });
  },
}));
registerStore('feed', useFeed);

export const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
