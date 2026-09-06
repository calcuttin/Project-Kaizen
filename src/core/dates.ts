import {
  addDays,
  differenceInCalendarDays,
  endOfYear,
  format,
  isSameDay,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import type { DateKey } from './types';

export const toDateKey = (d: Date = new Date()): DateKey => format(d, 'yyyy-MM-dd');
export const fromDateKey = (k: DateKey): Date => parseISO(k);
export const todayKey = (): DateKey => toDateKey(new Date());

export function shiftKey(k: DateKey, days: number): DateKey {
  return toDateKey(addDays(fromDateKey(k), days));
}

/** Last N day keys ending today (inclusive), oldest first. */
export function lastNDays(n: number, end: Date = new Date()): DateKey[] {
  const out: DateKey[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(toDateKey(addDays(end, -i)));
  return out;
}

/** Keys for the current week (Mon..Sun). */
export function currentWeekKeys(ref: Date = new Date()): DateKey[] {
  const start = startOfWeek(ref, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(start, i)));
}

export function humanDate(k: DateKey | undefined | null): string {
  if (!k) return '';
  const d = fromDateKey(k);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isYesterday(d)) return 'Yesterday';
  const diff = differenceInCalendarDays(d, new Date());
  if (diff > 0 && diff < 7) return format(d, 'EEEE');
  return format(d, 'MMM d');
}

export function isOverdue(k: DateKey | undefined | null): boolean {
  if (!k) return false;
  return differenceInCalendarDays(fromDateKey(k), new Date()) < 0;
}

export function daysUntil(k: DateKey): number {
  return differenceInCalendarDays(fromDateKey(k), new Date());
}

export function yearProgress(ref: Date = new Date()): { elapsed: number; total: number; fraction: number } {
  const total = differenceInCalendarDays(endOfYear(ref), startOfYear(ref)) + 1;
  const elapsed = differenceInCalendarDays(ref, startOfYear(ref)) + 1;
  return { elapsed, total, fraction: elapsed / total };
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Winding down';
}

export { format, isSameDay };
