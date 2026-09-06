import { SHELF_THEMES } from '@/modules/library/themes';
import { OBJECTS } from '@/modules/library/cabinet';
type RecordValue = Record<string, unknown>;
export const isRecord = (value: unknown): value is RecordValue => Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype);
const strings = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === 'string');
const fields: Record<string, Record<string, string>> = {
  'tasks.tasks': { id: 'string', title: 'string', createdAt: 'string', updatedAt: 'string', tags: 'strings', subtasks: 'array', status: 'inbox|next|doing|waiting|done', domain: 'personal|business', priority: 'number', order: 'number' },
  'tasks.projects': { id: 'string', name: 'string', color: 'string', domain: 'personal|business' },
  'library.books': { id: 'string', title: 'string', author: 'string', createdAt: 'string', updatedAt: 'string', pages: 'number', currentPage: 'number', status: 'want|reading|finished|paused', tags: 'strings', hue: 'number' },
  'library.shelves': { id: 'string', name: 'string', order: 'number' },
  'library.sessions': { id: 'string', bookId: 'string', date: 'string', pages: 'number' },
  'library.annotations': { id: 'string', bookId: 'string', kind: 'highlight|note|bookmark', content: 'string' },
  'health.habits': { id: 'string', name: 'string', emoji: 'string', kind: 'check|count', target: 'number', daysPerWeek: 'number', order: 'number' },
  'health.goals': { id: 'string', title: 'string', unit: 'string', emoji: 'string', start: 'number', target: 'number', entries: 'array' },
  'journal.entries': { date: 'string', wins: 'strings' },
  'studio.channels': { id: 'string', name: 'string', kind: 'podcast|substack|youtube|newsletter|other', color: 'string', cadenceDays: 'number', metricKeys: 'strings' },
  'studio.pieces': { id: 'string', channelId: 'string', title: 'string', format: 'post|episode|video|note', stage: 'idea|outline|production|edit|scheduled|published', tags: 'strings', order: 'number' },
  'studio.snapshots': { id: 'string', channelId: 'string', date: 'string', values: 'record' },
  'feed.sources': { id: 'string', name: 'string', kind: 'podcast|substack|newsletter|youtube|blog', color: 'string' },
  'feed.items': { id: 'string', sourceId: 'string', title: 'string', status: 'queued|in-progress|done|skipped' },
  'imports.runs': { id: 'string', adapter: 'csv|kindle', fileName: 'string', createdAt: 'string', created: 'number', skipped: 'number', warningCount: 'number', createdBookIds: 'strings', createdAnnotationIds: 'strings' },
};
function matches(value: unknown, type: string): boolean {
  if (type === 'strings') return strings(value);
  if (type === 'array') return Array.isArray(value);
  if (type === 'record') return isRecord(value);
  if (type.includes('|')) return typeof value === 'string' && type.split('|').includes(value);
  return typeof value === type && (type !== 'number' || Number.isFinite(value));
}
function validateFields(value: unknown, schema: Record<string, string>) {
  return isRecord(value) && Object.entries(schema).every(([key, type]) => matches(value[key], type));
}
export function validateBackupField(path: string, value: unknown, current: unknown) {
  const fail = () => { throw new Error(`Invalid backup data in ${path}. Nothing was restored.`); };
  if (Array.isArray(current) ? !Array.isArray(value) : isRecord(current) ? !isRecord(value) : path === 'studio.initialized' ? !['boolean', 'number'].includes(typeof value) : typeof value !== typeof current) fail();
  if (path.endsWith('.importedCollections') && !strings(value)) fail();
  if (path === 'library.goal' && !validateFields(value, { year: 'number', books: 'number', pagesPerDay: 'number' })) fail();
  if (path === 'health.logs' && (!isRecord(value) || Object.values(value).some((dates) => !isRecord(dates) || Object.values(dates).some((n) => typeof n !== 'number' || !Number.isFinite(n))))) fail();
  const schema = fields[path];
  if (!schema) return;
  for (const [key, item] of Object.entries(value as object)) {
    if (!validateFields(item, schema)) fail();
    const record = item as RecordValue;
    if (schema.id && !['library.sessions', 'studio.snapshots', 'imports.runs'].includes(path) && !validateFields(record, { createdAt: 'string', updatedAt: 'string' })) fail();
    if (path === 'library.shelves') {
      if (record.cabinet !== undefined && (!validateFields(record.cabinet, { lighting: 'warm|moonlight|candle', layout: 'layered|balanced', brightness: 'number' }) || ((record.cabinet as RecordValue).brightness as number) < 35 || ((record.cabinet as RecordValue).brightness as number) > 100)) fail();
      if (record.theme !== undefined && (typeof record.theme !== 'string' || !Object.hasOwn(SHELF_THEMES, record.theme))) fail();
      if (record.objects !== undefined && (!Array.isArray(record.objects) || record.objects.length !== 2 || record.objects.some((item) => typeof item !== 'string' || !Object.hasOwn(OBJECTS, item)))) fail();
    }
    for (const field of ['revision', 'rating', 'mood', 'durationMin', 'progressMin', 'page', 'warningCount']) if (record[field] !== undefined && (typeof record[field] !== 'number' || !Number.isFinite(record[field]))) fail();
    for (const field of ['archived', 'pinned', 'coverUnavailable']) if (record[field] !== undefined && typeof record[field] !== 'boolean') fail();
    if (!Array.isArray(value) && schema.id && record.id !== key) fail();
    if (path === 'tasks.tasks' && (record.subtasks as unknown[]).some((sub) => !validateFields(sub, { id: 'string', title: 'string', done: 'boolean' }))) fail();
    if (path === 'health.goals' && (record.entries as unknown[]).some((entry) => !validateFields(entry, { date: 'string', value: 'number' }))) fail();
    if (path === 'studio.snapshots' && Object.values(record.values as object).some((n) => typeof n !== 'number' || !Number.isFinite(n))) fail();
    // Optional text is still text: malformed notes must never break renderers.
    for (const field of ['notes', 'intention', 'reflection', 'gratitude', 'isbn', 'coverUrl', 'takeaway', 'url', 'notionUrl', 'guest', 'publishDate', 'due', 'scheduled', 'completedAt', 'startedAt', 'finishedAt', 'undoneAt']) {
      if (record[field] !== undefined && typeof record[field] !== 'string') fail();
    }
  }
}

export function assertSafeJson(value: unknown, depth = 0): void {
  if (depth > 40) throw new Error('Backup nesting is too deep. Nothing was restored.');
  if (value === null || ['string', 'boolean', 'undefined'].includes(typeof value) || (typeof value === 'number' && Number.isFinite(value))) return;
  if (!Array.isArray(value) && !isRecord(value)) throw new Error('Invalid backup value. Nothing was restored.');
  for (const [key, item] of Object.entries(value as object)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Unsafe backup key. Nothing was restored.');
    assertSafeJson(item, depth + 1);
  }
}
