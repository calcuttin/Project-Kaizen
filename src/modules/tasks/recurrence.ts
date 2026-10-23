import { differenceInCalendarDays } from 'date-fns';
import { fromDateKey, isDateKey, shiftKey, toDateKey } from '@/core/dates';

export type Recurrence = { frequency: 'daily' | 'weekly' | 'monthly'; anchorDay: number };
export function validRecurrence(value: unknown): value is Recurrence {
  if (!value || typeof value !== 'object') return false;
  const r = value as Recurrence;
  return ['daily', 'weekly', 'monthly'].includes(r.frequency) && Number.isInteger(r.anchorDay) && r.anchorDay >= 1 && r.anchorDay <= 31;
}
/** Next scheduled date strictly after both the current due date and completion day. */
export function nextRecurringDate(due: string, recurrence: Recurrence, completed: string): string | undefined {
  if (!isDateKey(due) || !isDateKey(completed) || !validRecurrence(recurrence)) return;
  const after = due > completed ? due : completed;
  let next: string;
  if (recurrence.frequency !== 'monthly') {
    const step = recurrence.frequency === 'weekly' ? 7 : 1;
    const elapsed = differenceInCalendarDays(fromDateKey(after), fromDateKey(due));
    next = shiftKey(due, (Math.floor(elapsed / step) + 1) * step);
  } else {
    const source = fromDateKey(due), end = fromDateKey(after);
    let months = Math.max(1, (end.getFullYear() - source.getFullYear()) * 12 + end.getMonth() - source.getMonth());
    const at = (offset: number) => {
      const d = new Date(source.getFullYear(), source.getMonth() + offset, 1, 12);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(recurrence.anchorDay, last));
      return toDateKey(d);
    };
    next = at(months);
    if (next <= after) next = at(++months);
  }
  return isDateKey(next) ? next : undefined;
}
