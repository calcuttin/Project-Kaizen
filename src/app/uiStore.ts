import { create } from 'zustand';
import { createPersistedStore } from '@/core/store';
import type { Lens } from '@/core/types';

type Theme = 'dark' | 'light';
interface UIState {
  lens: Lens;
  theme: Theme;
  externalBookCovers: boolean;
  setLens: (l: Lens) => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setExternalBookCovers: (enabled: boolean) => void;
}

export const useUI = createPersistedStore<UIState>('ui', 1, (set, get) => ({
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
