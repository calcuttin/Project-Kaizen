import { createPersistedStore, registerStore } from '@/core/store';
import { newId, nowIso } from '@/core/ids';
import { lastNDays, shiftKey, todayKey } from '@/core/dates';
import type { BaseEntity, DateKey, ID } from '@/core/types';

/** A habit is a recurring behavior. 'check' habits are binary; 'count' habits accumulate toward a target. */
export interface Habit extends BaseEntity {
  name: string;
  emoji: string;
  kind: 'check' | 'count';
  target: number;      // for count habits (e.g., 8 glasses); 1 for check
  unit?: string;       // "glasses", "min", "km"
  /** Days per week you intend to do it (7 = daily). Used for weekly scoring. */
  daysPerWeek: number;
  archived?: boolean;
  order: number;
}

/** A measurable outcome you're driving toward, e.g. "Weight → 175 lb by Dec". */
export interface HealthGoal extends BaseEntity {
  title: string;
  unit: string;
  start: number;
  target: number;
  deadline?: DateKey;
  entries: { date: DateKey; value: number }[];
  emoji: string;
}

interface HealthState {
  habits: Record<ID, Habit>;
  /** logs[habitId][dateKey] = value */
  logs: Record<ID, Record<DateKey, number>>;
  goals: Record<ID, HealthGoal>;
  addHabit: (h: Pick<Habit, 'name' | 'emoji' | 'kind'> & Partial<Habit>) => Habit;
  updateHabit: (id: ID, patch: Partial<Habit>) => void;
  deleteHabit: (id: ID) => void;
  setLog: (habitId: ID, date: DateKey, value: number) => void;
  toggleLog: (habitId: ID, date?: DateKey) => void;
  incrementLog: (habitId: ID, delta: number, date?: DateKey) => void;
  addGoal: (g: Pick<HealthGoal, 'title' | 'unit' | 'start' | 'target'> & Partial<HealthGoal>) => HealthGoal;
  updateGoal: (id: ID, patch: Partial<HealthGoal>) => void;
  deleteGoal: (id: ID) => void;
  logGoalEntry: (goalId: ID, value: number, date?: DateKey) => void;
}

export const useHealth = createPersistedStore<HealthState>('health', 1, (set, get) => ({
  habits: {}, logs: {}, goals: {},

  addHabit: (input) => {
    const now = nowIso();
    const h: Habit = {
      id: newId(), createdAt: now, updatedAt: now, name: input.name.trim(), emoji: input.emoji || '✅', kind: input.kind,
      target: input.kind === 'count' ? (input.target ?? 1) : 1, unit: input.unit, daysPerWeek: input.daysPerWeek ?? 7,
      order: Object.keys(get().habits).length,
    };
    set((s) => ({ habits: { ...s.habits, [h.id]: h } }));
    return h;
  },
  updateHabit: (id, patch) => set((s) => ({ habits: { ...s.habits, [id]: { ...s.habits[id], ...patch, updatedAt: nowIso() } } })),
  deleteHabit: (id) => set((s) => { const { [id]: _, ...habits } = s.habits; const { [id]: __, ...logs } = s.logs; return { habits, logs }; }),

  setLog: (habitId, date, value) => set((s) => ({ logs: { ...s.logs, [habitId]: { ...(s.logs[habitId] ?? {}), [date]: Math.max(0, value) } } })),
  toggleLog: (habitId, date = todayKey()) => {
    const cur = get().logs[habitId]?.[date] ?? 0;
    get().setLog(habitId, date, cur > 0 ? 0 : 1);
  },
  incrementLog: (habitId, delta, date = todayKey()) => {
    const cur = get().logs[habitId]?.[date] ?? 0;
    get().setLog(habitId, date, cur + delta);
  },

  addGoal: (input) => {
    const now = nowIso();
    const g: HealthGoal = { id: newId(), createdAt: now, updatedAt: now, title: input.title.trim(), unit: input.unit, start: input.start, target: input.target, deadline: input.deadline, emoji: input.emoji ?? '🎯', entries: input.entries ?? [{ date: todayKey(), value: input.start }] };
    set((s) => ({ goals: { ...s.goals, [g.id]: g } }));
    return g;
  },
  updateGoal: (id, patch) => set((s) => ({ goals: { ...s.goals, [id]: { ...s.goals[id], ...patch, updatedAt: nowIso() } } })),
  deleteGoal: (id) => set((s) => { const { [id]: _, ...goals } = s.goals; return { goals }; }),
  logGoalEntry: (goalId, value, date = todayKey()) => {
    const g = get().goals[goalId]; if (!g) return;
    const entries = [...g.entries.filter((e) => e.date !== date), { date, value }].sort((a, b) => (a.date < b.date ? -1 : 1));
    get().updateGoal(goalId, { entries });
  },
}));
registerStore('health', useHealth);

/* ── Derived helpers ──────────────────────────────────── */
export const habitDone = (h: Habit, value: number | undefined) => (value ?? 0) >= h.target;

export function habitStreak(h: Habit, logs: Record<DateKey, number> | undefined): number {
  if (!logs) return 0;
  let streak = 0;
  let d = todayKey();
  // Today doesn't break the streak if not yet done.
  if (!habitDone(h, logs[d])) d = shiftKey(d, -1);
  while (habitDone(h, logs[d])) { streak++; d = shiftKey(d, -1); }
  return streak;
}

export function weeklyCompletion(h: Habit, logs: Record<DateKey, number> | undefined, days = 7): number {
  const keys = lastNDays(days);
  const done = keys.filter((k) => habitDone(h, logs?.[k])).length;
  return done / Math.min(days, h.daysPerWeek || 7);
}

export function goalProgress(g: HealthGoal): { current: number; fraction: number } {
  const current = g.entries.length ? g.entries[g.entries.length - 1].value : g.start;
  const span = g.target - g.start;
  const fraction = span === 0 ? 1 : Math.max(0, Math.min(1, (current - g.start) / span));
  return { current, fraction };
}
