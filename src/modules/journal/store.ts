import { createPersistedStore, registerStore } from '@/core/store';
import { todayKey } from '@/core/dates';
import type { DateKey } from '@/core/types';

/**
 * The Kaizen journal: one entry per day.
 * Morning → "one small improvement" intention.  Evening → reflection + mood + wins.
 */
export interface DayEntry {
  date: DateKey;
  intention?: string;
  reflection?: string;
  mood?: 1 | 2 | 3 | 4 | 5;
  wins: string[];
  gratitude?: string;
}

interface JournalState {
  entries: Record<DateKey, DayEntry>;
  upsert: (date: DateKey, patch: Partial<DayEntry>) => void;
  addWin: (win: string, date?: DateKey) => void;
  removeWin: (index: number, date?: DateKey) => void;
}

export const useJournal = createPersistedStore<JournalState>('journal', 1, (set, get) => ({
  entries: {},
  upsert: (date, patch) => set((s) => { const prev: DayEntry = s.entries[date] ?? { date, wins: [] }; return { entries: { ...s.entries, [date]: { ...prev, ...patch } } }; }),
  addWin: (win, date = todayKey()) => { if (!win.trim()) return; const e = get().entries[date]; get().upsert(date, { wins: [...(e?.wins ?? []), win.trim()] }); },
  removeWin: (index, date = todayKey()) => { const e = get().entries[date]; if (!e) return; get().upsert(date, { wins: e.wins.filter((_, i) => i !== index) }); },
}));
registerStore('journal', useJournal);

export const MOODS: { v: 1 | 2 | 3 | 4 | 5; emoji: string; label: string }[] = [
  { v: 1, emoji: '😮‍💨', label: 'Drained' }, { v: 2, emoji: '😕', label: 'Low' }, { v: 3, emoji: '😐', label: 'Steady' }, { v: 4, emoji: '🙂', label: 'Good' }, { v: 5, emoji: '😄', label: 'Great' },
];
