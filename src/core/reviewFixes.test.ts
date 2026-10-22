import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isDateKey, humanDate, todayKey, shiftKey } from './dates';
import { parseQuickAdd } from './parse';
import { importAll, inspectBackup } from './store';
import { useTasks } from '@/modules/tasks/store';
import { useHealth, habitStreak, weeklyCompletion } from '@/modules/health/store';
import { applyRemoteChanges } from './sync/storeBridge';
import { searchRecords } from './search';

beforeEach(() => {
  useTasks.setState({ tasks: {}, projects: {} });
  useHealth.setState({ habits: {}, logs: {}, goals: {} });
});

describe('calendar validation and recovery', () => {
  it.each(['2026-13-01', '2026-02-29', '2026-04-31', '2026-00-01'])('keeps invalid date %s as text without crashing', (date) => {
    const parsed = parseQuickAdd(`Review ${date}`);
    expect(parsed.title).toBe(`Review ${date}`);
    expect(parsed.due).toBeUndefined();
    expect(parsed.warning).toBeTruthy();
    expect(humanDate(date)).toContain('Invalid date');
  });
  it('accepts leap days and keeps incomplete and overflowing dates as text', () => {
    expect(isDateKey('2028-02-29')).toBe(true);
    expect(parseQuickAdd('Review 2028-02-29').due).toBe('2028-02-29');
    expect(parseQuickAdd('Review 2026-1').title).toBe('Review 2026-1');
    expect(parseQuickAdd('Review in 999999999999999999999 days').due).toBeUndefined();
  });
  it('rejects invalid restore data before changing any store', () => {
    const task = useTasks.getState().addTask({ title: 'Preserve me' });
    const habit = useHealth.getState().addHabit({ name: 'Walk', emoji: 'W', kind: 'check' });
    const payload = { app: 'kaizen', stores: { tasks: { tasks: {} }, health: { habits: { [habit.id]: { ...habit, target: 0 } } } } };
    expect(() => importAll(payload)).toThrow();
    expect(useTasks.getState().tasks[task.id]).toEqual(task);
    expect(() => inspectBackup({ app: 'kaizen', stores: { tasks: { tasks: { [task.id]: { ...task, due: '2026-13-01' } } } } })).toThrow();
    expect(() => useTasks.getState().updateTask(task.id, { due: '2026-02-30' })).toThrow();
  });
  it('validates a whole remote batch before applying any of it', () => {
    const task = useTasks.getState().addTask({ title: 'Keep local' });
    const change = { seq: 1, entity_type: 'tasks', entity_id: task.id, operation: 'put' as const, payload: { ...task, title: 'Remote edit' }, revision: 1, changed_at: task.updatedAt };
    expect(() => applyRemoteChanges([change, { ...change, seq: 2, entity_id: 'bad', payload: { ...task, id: 'bad', due: '2026-13-01' } }])).toThrow('Invalid synced data');
    expect(useTasks.getState().tasks[task.id].title).toBe('Keep local');
    applyRemoteChanges([change]);
    expect(useTasks.getState().tasks[task.id].title).toBe('Remote edit');
  });
});

describe('habit safety and history', () => {
  it.each([0, -1, Infinity, NaN])('rejects target %s at the store boundary', (target) => {
    expect(() => useHealth.getState().addHabit({ name: 'Count', emoji: 'C', kind: 'count', target })).toThrow();
  });
  it('keeps malformed legacy records safe and editable', () => {
    const habit = useHealth.getState().addHabit({ name: 'Count', emoji: 'C', kind: 'count', target: 8 });
    expect(habitStreak({ ...habit, target: 0 }, {})).toBe(0);
    expect(habitStreak({ ...habit, target: -1 }, { [todayKey()]: 10 })).toBe(0);
    useHealth.getState().setLog(habit.id, todayKey(), 8);
    useHealth.getState().updateHabit(habit.id, { name: 'Water', archived: true });
    useHealth.getState().updateHabit(habit.id, { archived: false });
    expect(useHealth.getState().logs[habit.id][todayKey()]).toBe(8);
  });
  it('scores only tracked days and bounds daily streaks at creation', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-22T12:00:00Z'));
    try {
      const habit = useHealth.getState().addHabit({ name: 'Walk', emoji: 'W', kind: 'check' });
      const logs = { [todayKey()]: 1, [shiftKey(todayKey(), -1)]: 1 };
      expect(weeklyCompletion(habit, logs)).toBe(1);
      expect(habitStreak(habit, logs)).toBe(1);
      expect(weeklyCompletion({ ...habit, createdAt: '2026-10-01T12:00:00Z', daysPerWeek: 2 }, logs)).toBe(1);
      expect(habitStreak({ ...habit, daysPerWeek: 2 }, logs)).toBe(0);
    } finally { vi.useRealTimers(); }
  });
});

it('ranks exact saved-record matches first across areas', () => {
  const results = searchRecords('plan', [
    { id: 'a', title: 'Annual plan', area: 'Tasks', path: '/tasks' },
    { id: 'b', title: 'Plan', area: 'Library', path: '/library' },
    { id: 'c', title: 'Planning', area: 'Studio', path: '/studio' },
  ]);
  expect(results.map((record) => record.id)).toEqual(['b', 'c', 'a']);
  expect(searchRecords('', results)).toEqual([]);
});
