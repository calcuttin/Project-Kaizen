import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { habitStreak, weeklyCompletion, type Habit } from './store';
const habit = (patch: Partial<Habit> = {}): Habit => ({ id: 'h', name: 'Walk', emoji: 'W', kind: 'check', target: 1, daysPerWeek: 7, order: 0, createdAt: '2026-01-01T12:00:00Z', updatedAt: '2026-01-01T12:00:00Z', ...patch });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
describe('rolling habit scoring', () => {
  it('counts missed eligible days and spans the Sunday/Monday boundary', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-12T12:00:00Z'));
    expect(weeklyCompletion(habit(), { '2026-01-11': 1, '2026-01-12': 1 })).toBe(2 / 7);
    expect(weeklyCompletion(habit({ daysPerWeek: 2 }), { '2026-01-11': 1, '2026-01-12': 1 })).toBe(1);
    expect(weeklyCompletion(habit(), { '2026-01-05': 1, '2026-01-13': 1 })).toBe(0);
  });
  it('bounds partial weeks and preserves imported logs before the tracking start without counting them', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-12T12:00:00Z'));
    const logs = { '2026-01-10': 1, '2026-01-12': 1 };
    expect(weeklyCompletion(habit({ daysPerWeek: 3, createdAt: '2026-01-11T12:00:00Z' }), logs)).toBe(.5);
    expect(logs['2026-01-10']).toBe(1);
    expect(habitStreak(habit(), { '2026-01-10': 1, '2026-01-12': 1 })).toBe(1);
  });
  it('uses the local creation day across midnight and daylight-saving transitions', () => {
    vi.stubEnv('TZ', 'America/Los_Angeles');
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-03-09T00:30:00Z'));
    const h = habit({ createdAt: '2026-03-08T07:30:00Z' }); // March 7 locally, before spring-forward.
    const logs = { '2026-03-07': 1, '2026-03-08': 1 };
    expect(weeklyCompletion(h, logs)).toBe(1);
    expect(habitStreak(h, logs)).toBe(2);
  });
  it('re-scores target and frequency changes without mutating history', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-12T12:00:00Z'));
    const logs = { '2026-01-11': 1, '2026-01-12': 2 };
    expect(weeklyCompletion(habit({ kind: 'count', target: 2, daysPerWeek: 2 }), logs)).toBe(.5);
    expect(weeklyCompletion(habit({ daysPerWeek: 2 }), logs)).toBe(1);
    expect(habitStreak(habit({ daysPerWeek: 2 }), logs)).toBe(0);
    expect(logs).toEqual({ '2026-01-11': 1, '2026-01-12': 2 });
  });
});
