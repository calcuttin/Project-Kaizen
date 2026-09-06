/**
 * Studio — the module for content YOU make: your podcast, your Substack, your brand.
 * Channels publish Pieces through a pipeline; MetricSnapshots track audience growth over time.
 */
import { createPersistedStore, registerStore } from '@/core/store';
import { newId, nowIso } from '@/core/ids';
import { daysUntil, shiftKey, todayKey } from '@/core/dates';
import type { BaseEntity, DateKey, ID } from '@/core/types';

export type ChannelKind = 'podcast' | 'substack' | 'youtube' | 'newsletter' | 'other';
export const CHANNEL_KIND: Record<ChannelKind, string> = { podcast: 'Podcast', substack: 'Substack', youtube: 'YouTube', newsletter: 'Newsletter', other: 'Other' };

/** Default audience metrics per channel kind. Channels can override. */
export const DEFAULT_METRICS: Record<ChannelKind, string[]> = {
  podcast: ['Downloads (30d)', 'Followers'],
  substack: ['Subscribers', 'Paid subscribers', 'Open rate %'],
  youtube: ['Subscribers', 'Views (30d)'],
  newsletter: ['Subscribers', 'Open rate %'],
  other: ['Audience'],
};

export interface Channel extends BaseEntity {
  name: string;
  kind: ChannelKind;
  url?: string;
  color: string;
  /** Publishing cadence target in days (7 = weekly). */
  cadenceDays: number;
  metricKeys: string[];
  archived?: boolean;
}

export type Stage = 'idea' | 'outline' | 'production' | 'edit' | 'scheduled' | 'published';
export const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: 'idea', label: 'Ideas', hint: 'Anything worth exploring' },
  { id: 'outline', label: 'Outline', hint: 'Angle, structure, guests' },
  { id: 'production', label: 'Writing / Recording', hint: 'Making the thing' },
  { id: 'edit', label: 'Editing', hint: 'Cut, polish, art' },
  { id: 'scheduled', label: 'Scheduled', hint: 'Has a publish date' },
  { id: 'published', label: 'Published', hint: 'Out in the world' },
];

export type PieceFormat = 'post' | 'episode' | 'video' | 'note';
export const PIECE_FORMAT: Record<PieceFormat, { label: string; emoji: string }> = {
  post: { label: 'Post', emoji: '✍️' }, episode: { label: 'Episode', emoji: '🎙️' }, video: { label: 'Video', emoji: '▶️' }, note: { label: 'Note', emoji: '📝' },
};

export interface Piece extends BaseEntity {
  channelId: ID;
  title: string;
  format: PieceFormat;
  stage: Stage;
  notes?: string;
  guest?: string;
  publishDate?: DateKey;   // planned or actual
  url?: string;
  tags: string[];
  order: number;
}

export interface MetricSnapshot { id: ID; channelId: ID; date: DateKey; values: Record<string, number> }

interface StudioState {
  channels: Record<ID, Channel>;
  pieces: Record<ID, Piece>;
  snapshots: MetricSnapshot[];
  /** Bumped when the default-channel setup changes shape. */
  initialized: boolean | number;
  ensureDefaults: () => void;
  addChannel: (c: Pick<Channel, 'name' | 'kind'> & Partial<Channel>) => Channel;
  updateChannel: (id: ID, patch: Partial<Channel>) => void;
  deleteChannel: (id: ID) => void;
  addPiece: (p: Pick<Piece, 'channelId' | 'title'> & Partial<Piece>) => Piece;
  updatePiece: (id: ID, patch: Partial<Piece>) => void;
  deletePiece: (id: ID) => void;
  movePiece: (id: ID, stage: Stage) => void;
  logSnapshot: (channelId: ID, values: Record<string, number>, date?: DateKey) => void;
}

const COLORS = ['#e8b04b', '#7dcfff', '#bb9af7', '#9ece6a', '#f7768e', '#ff9e64'];

export const useStudio = createPersistedStore<StudioState>('studio', 1, (set, get) => ({
  channels: {}, pieces: {}, snapshots: [], initialized: false,

  // Existing channels are user data. New workspaces start without any personal defaults.
  ensureDefaults: () => { if (get().initialized !== 4) set({ initialized: 4 }); },

  addChannel: (input) => {
    const now = nowIso();
    const c: Channel = { id: newId(), createdAt: now, updatedAt: now, name: input.name.trim(), kind: input.kind, url: input.url, cadenceDays: input.cadenceDays ?? 7, metricKeys: input.metricKeys ?? DEFAULT_METRICS[input.kind], color: input.color ?? COLORS[Object.keys(get().channels).length % COLORS.length] };
    set((s) => ({ channels: { ...s.channels, [c.id]: c } }));
    return c;
  },
  updateChannel: (id, patch) => set((s) => ({ channels: { ...s.channels, [id]: { ...s.channels[id], ...patch, updatedAt: nowIso() } } })),
  deleteChannel: (id) => set((s) => {
    const { [id]: _, ...channels } = s.channels;
    return { channels, pieces: Object.fromEntries(Object.entries(s.pieces).filter(([, p]) => p.channelId !== id)), snapshots: s.snapshots.filter((x) => x.channelId !== id) };
  }),

  addPiece: (input) => {
    const now = nowIso();
    const stage = input.stage ?? 'idea';
    const siblings = Object.values(get().pieces).filter((p) => p.stage === stage);
    const p: Piece = { id: newId(), createdAt: now, updatedAt: now, channelId: input.channelId, title: input.title.trim(), format: input.format ?? 'post', stage, notes: input.notes, guest: input.guest, publishDate: input.publishDate, url: input.url, tags: input.tags ?? [], order: siblings.length ? Math.min(...siblings.map((x) => x.order)) - 1 : 0 };
    set((s) => ({ pieces: { ...s.pieces, [p.id]: p } }));
    return p;
  },
  updatePiece: (id, patch) => set((s) => ({ pieces: { ...s.pieces, [id]: { ...s.pieces[id], ...patch, updatedAt: nowIso() } } })),
  deletePiece: (id) => set((s) => { const { [id]: _, ...pieces } = s.pieces; return { pieces }; }),
  movePiece: (id, stage) => {
    const p = get().pieces[id]; if (!p) return;
    const patch: Partial<Piece> = { stage };
    if (stage === 'published' && !p.publishDate) patch.publishDate = todayKey();
    get().updatePiece(id, patch);
  },

  logSnapshot: (channelId, values, date = todayKey()) => set((s) => ({
    snapshots: [...s.snapshots.filter((x) => !(x.channelId === channelId && x.date === date)), { id: newId(), channelId, date, values }].sort((a, b) => (a.date < b.date ? -1 : 1)),
  })),
}));
registerStore('studio', useStudio);

/* ── Derived ──────────────────────────────────────────── */
export function channelSnapshots(snaps: MetricSnapshot[], channelId: ID): MetricSnapshot[] {
  return snaps.filter((s) => s.channelId === channelId);
}

/** Latest value + delta vs. previous snapshot for one metric. */
export function metricTrend(snaps: MetricSnapshot[], key: string): { latest?: number; delta?: number; series: number[] } {
  const series = snaps.map((s) => s.values[key]).filter((v): v is number => typeof v === 'number');
  const latest = series.at(-1);
  const prev = series.at(-2);
  return { latest, delta: latest !== undefined && prev !== undefined ? latest - prev : undefined, series };
}

/** Cadence health: when was the last publish, and when is the next one due? */
export function cadence(channel: Channel, pieces: Piece[]): { last?: DateKey; nextDue: DateKey; daysLeft: number; streak: number } {
  const published = pieces.filter((p) => p.channelId === channel.id && p.stage === 'published' && p.publishDate).map((p) => p.publishDate!).sort();
  const last = published.at(-1);
  const nextDue = last ? shiftKey(last, channel.cadenceDays) : todayKey();
  // Streak: consecutive cadence windows (counting back from the last publish) that contained a publish.
  let streak = 0;
  if (last) {
    let windowEnd = last;
    const set = new Set(published);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const windowStart = shiftKey(windowEnd, -channel.cadenceDays);
      const hit = [...set].some((d) => d > windowStart && d <= windowEnd);
      if (!hit) break;
      streak++; windowEnd = windowStart;
      if (streak > 200) break;
    }
  }
  return { last, nextDue, daysLeft: daysUntil(nextDue), streak };
}
