import { expect, it } from 'vitest';
import { searchRecords } from './search';
it('handles whitespace, case, partial details, no matches and result limits', () => {
  const records = [{ id: '1', title: 'Plan', detail: 'Cal Newport', area: 'Library', path: '/library' }, { id: '2', title: 'Planning ahead', area: 'Tasks', path: '/tasks' }];
  expect(searchRecords('  PLAN  ', records).map(x => x.id)).toEqual(['1', '2']);
  expect(searchRecords('newport', records).map(x => x.id)).toEqual(['1']);
  expect(searchRecords('unmatched', records)).toEqual([]);
  expect(searchRecords(' ', records)).toEqual([]);
  expect(searchRecords('plan', records, 1)).toHaveLength(1);
});
