/**
 * Natural quick-add parser. Turns "Call the accountant @business #taxes !1 tomorrow" into structured fields.
 * Tokens:
 *   @personal / @business  → domain
 *   #project               → project name
 *   !1..!3 or !high/!med/!low → priority
 *   today / tomorrow / mon..sun / "in 3 days" / 2026-09-10 → due date
 */
import { addDays, nextDay, type Day } from 'date-fns';
import { isDateKey, toDateKey } from './dates';
import type { DateKey, Domain } from './types';

export interface ParsedQuickAdd {
  title: string;
  domain?: Domain;
  project?: string;
  priority?: 0 | 1 | 2 | 3;
  due?: DateKey;
  tags: string[];
  warning?: string;
}

const DAY_NAMES: Record<string, Day> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

export function parseQuickAdd(input: string, ref: Date = new Date()): ParsedQuickAdd {
  const out: ParsedQuickAdd = { title: '', tags: [] };
  const words = input.trim().split(/\s+/);
  const kept: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const lower = w.toLowerCase();

    if (lower === '@personal' || lower === '@business') { out.domain = lower.slice(1) as Domain; continue; }
    if (w.startsWith('#') && w.length > 1) { out.project = w.slice(1); continue; }
    if (w.startsWith('+') && w.length > 1) { out.tags.push(w.slice(1)); continue; }
    if (/^!(1|2|3|high|med|low)$/i.test(w)) {
      const p = lower.slice(1);
      out.priority = p === '1' || p === 'high' ? 3 : p === '2' || p === 'med' ? 2 : 1;
      continue;
    }
    if (lower === 'today') { out.due = toDateKey(ref); continue; }
    if (lower === 'tomorrow' || lower === 'tmrw') { out.due = toDateKey(addDays(ref, 1)); continue; }
    if (/^\d{4}-\d{2}-\d{2}$/.test(w)) {
      if (isDateKey(w)) { out.due = w; continue; }
      out.warning = 'That date does not exist. Correct it, or keep it as task text.';
    }
    const dayKey = lower.slice(0, 3);
    if (lower.length >= 3 && dayKey in DAY_NAMES && /^(sun|mon|tue|wed|thu|fri|sat)(day|nes|rs|ur)?(day)?$/.test(lower)) {
      out.due = toDateKey(nextDay(ref, DAY_NAMES[dayKey])); continue;
    }
    if (lower === 'in' && /^\d+$/.test(words[i + 1] ?? '') && /^days?$/.test(words[i + 2] ?? '')) {
      const days = Number(words[i + 1]);
      if (Number.isSafeInteger(days) && days <= 36500) {
        const candidate = addDays(ref, days);
        if (!Number.isNaN(candidate.getTime())) { out.due = toDateKey(candidate); i += 2; continue; }
      }
      out.warning = 'That date is too far away. Keep it as text or choose a nearer date.';
    }
    kept.push(w);
  }

  out.title = kept.join(' ').trim();
  return out;
}
