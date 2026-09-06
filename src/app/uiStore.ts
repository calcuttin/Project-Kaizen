import { create } from 'zustand';
import { createPersistedStore } from '@/core/store';
import type { Lens } from '@/core/types';

export const TODAY_SECTIONS = ['checkin', 'studio', 'habits', 'reading', 'up-next'];
export const TODAY_LABELS: Record<string, string> = { tasks: 'Tasks', intention: 'Daily focus', checkin: 'A moment for you', studio: 'Studio', habits: 'Habits', reading: 'Reading', 'up-next': 'Feed' };

type Theme = 'dark' | 'light';
interface UIState {
  todayOrder: string[];
  todayHidden: string[];
  gettingStarted: boolean | null;
  lastBackupAt: string | null;
  setTodayLayout: (order: string[], hidden: string[]) => void;
  setGettingStarted: (show: boolean) => void;
  markBackup: () => void;
  lens: Lens;
  theme: Theme;
  externalBookCovers: boolean;
  setLens: (l: Lens) => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setExternalBookCovers: (enabled: boolean) => void;
}

export const useUI = createPersistedStore<UIState>('ui', 1, (set, get) => ({
  todayOrder: TODAY_SECTIONS,
  todayHidden: [],
  gettingStarted: null,
  lastBackupAt: null,
  setTodayLayout: (todayOrder, todayHidden) => set({ todayOrder, todayHidden }),
  setGettingStarted: (gettingStarted) => set({ gettingStarted }),
  markBackup: () => set({ lastBackupAt: new Date().toISOString() }),
  lens: 'all',
  theme: 'dark',
  externalBookCovers: false,
  setLens: (lens) => set({ lens }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
  setExternalBookCovers: (externalBookCovers) => set({ externalBookCovers }),
}));

/** Ephemeral UI state — deliberately NOT persisted (a reopened tab should never inherit an open palette). */
interface PaletteState { open: boolean; setOpen: (open: boolean) => void; toggle: () => void }
export const usePalette = create<PaletteState>((set, get) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set({ open: !get().open }),
}));
