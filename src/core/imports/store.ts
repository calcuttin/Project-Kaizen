import { createPersistedStore, registerStore } from '@/core/store';
import { newId, nowIso } from '@/core/ids';

export type ImportRun = {
  id: string;
  adapter: 'csv' | 'kindle';
  fileName: string;
  createdAt: string;
  created: number;
  skipped: number;
  warningCount: number;
  createdBookIds: string[];
  createdAnnotationIds: string[];
  createdShelfIds?: string[];
  undoneAt?: string;
};

type ImportState = {
  runs: ImportRun[];
  record: (run: Omit<ImportRun, 'id' | 'createdAt'>) => ImportRun;
  markUndone: (id: string) => void;
};

export const useImports = createPersistedStore<ImportState>('imports', 1, (set) => ({
  runs: [],
  record: (input) => {
    const run: ImportRun = { ...input, id: newId(), createdAt: nowIso() };
    set((state) => ({ runs: [run, ...state.runs].slice(0, 100) }));
    return run;
  },
  markUndone: (id) => set((state) => ({ runs: state.runs.map((run) => run.id === id ? { ...run, undoneAt: nowIso() } : run) })),
}));
registerStore('imports', useImports);
