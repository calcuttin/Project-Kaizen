import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { exportAll, importAll, inspectBackup } from '@/core/store';
import { useTasks } from './store';
import { nextRecurringDate } from './recurrence';

beforeEach(() => { useTasks.setState({ tasks: {}, projects: {} }); vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 22, 12)); });
afterEach(() => vi.useRealTimers());
it('skips missed dates and keeps weekly and month-end anchors', () => {
  expect(nextRecurringDate('2026-10-01', { frequency: 'daily', anchorDay: 1 }, '2026-10-22')).toBe('2026-10-23');
  expect(nextRecurringDate('2026-10-01', { frequency: 'weekly', anchorDay: 1 }, '2026-10-23')).toBe('2026-10-29');
  expect(nextRecurringDate('2026-01-31', { frequency: 'monthly', anchorDay: 31 }, '2026-01-31')).toBe('2026-02-28');
  expect(nextRecurringDate('2026-02-28', { frequency: 'monthly', anchorDay: 31 }, '2026-02-28')).toBe('2026-03-31');
  expect(nextRecurringDate('2028-01-31', { frequency: 'monthly', anchorDay: 31 }, '2028-01-31')).toBe('2028-02-29');
  expect(nextRecurringDate('2026-01-31', { frequency: 'monthly', anchorDay: 31 }, '2026-10-22')).toBe('2026-10-31');
  expect(nextRecurringDate('2026-03-07', { frequency: 'daily', anchorDay: 7 }, '2026-03-08')).toBe('2026-03-09');
});
for (const method of ['checkbox', 'editor', 'board']) {
  it(`${method} completion creates one successor, preserves history and avoids reopening duplicates`, () => {
    const t = useTasks.getState().addTask({ title: 'Review notes', due: '2026-10-20', domain: 'business', notes: 'Keep', tags: ['review'], recurrence: { frequency: 'weekly', anchorDay: 20 }, subtasks: [{ id: 'step', title: 'Read', done: true }] });
    const finish = () => method === 'checkbox' ? useTasks.getState().toggleDone(t.id) : method === 'editor' ? useTasks.getState().updateTask(t.id, { status: 'done' }) : useTasks.getState().moveTask(t.id, 'done');
    finish();
    const old = useTasks.getState().tasks[t.id];
    const next = useTasks.getState().tasks[old.nextOccurrenceId!];
    expect(old.completedAt).toBeDefined();
    expect(old.subtasks[0].done).toBe(true);
    expect(next).toMatchObject({ title: 'Review notes', due: '2026-10-27', status: 'next', domain: 'business', notes: 'Keep', tags: ['review'] });
    expect(next.subtasks[0].done).toBe(false);
    expect(next.completedAt).toBeUndefined();
    expect(next.revision).toBe(0);
    useTasks.getState().updateTask(t.id, { status: 'next' });
    expect(useTasks.getState().tasks[t.id].completedAt).toBeUndefined();
    finish();
    expect(Object.keys(useTasks.getState().tasks)).toHaveLength(2);
    useTasks.getState().deleteTask(next.id);
    useTasks.getState().updateTask(t.id, { status: 'next' });
    finish();
    expect(Object.keys(useTasks.getState().tasks)).toHaveLength(1);
  });
}
it('stops repeating without losing completion history and round-trips through backups', () => {
  const t = useTasks.getState().addTask({ title: 'Daily', due: '2026-10-22', recurrence: { frequency: 'daily', anchorDay: 22 } });
  useTasks.getState().toggleDone(t.id);
  const backup = JSON.parse(JSON.stringify(exportAll()));
  expect(() => inspectBackup(backup)).not.toThrow();
  useTasks.setState({ tasks: {} }); importAll(backup);
  const nextId = useTasks.getState().tasks[t.id].nextOccurrenceId!;
  useTasks.getState().updateTask(nextId, { recurrence: undefined });
  useTasks.getState().toggleDone(nextId);
  expect(Object.values(useTasks.getState().tasks)).toHaveLength(2);
  expect(Object.values(useTasks.getState().tasks).every(t => t.status === 'done')).toBe(true);
  expect(() => useTasks.getState().addTask({ title: 'Bad', recurrence: { frequency: 'daily', anchorDay: 1 } })).toThrow();
  const tampered = JSON.parse(JSON.stringify(backup));
  tampered.stores.tasks.tasks[t.id].recurrence.frequency = 'hourly';
  expect(() => inspectBackup(tampered)).toThrow();
});

it('two devices completing the same occurrence produce the same successor identity', () => {
  const t = useTasks.getState().addTask({ title: 'Shared series', due: '2026-10-22', recurrence: { frequency: 'daily', anchorDay: 22 } });
  const before = JSON.parse(JSON.stringify(useTasks.getState().tasks));
  useTasks.getState().toggleDone(t.id);
  const first = useTasks.getState().tasks[t.id].nextOccurrenceId;
  useTasks.setState({ tasks: before });
  useTasks.getState().toggleDone(t.id);
  expect(useTasks.getState().tasks[t.id].nextOccurrenceId).toBe(first);
  expect(useTasks.getState().tasks[first!].revision).toBe(0);
});
