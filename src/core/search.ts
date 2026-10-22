export type SearchRecord = { id: string; title: string; detail?: string; area: string; path: string };
export function searchRecords(query: string, records: SearchRecord[], limit = 20): SearchRecord[] {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return [];
  const rank = (record: SearchRecord) => record.title.toLocaleLowerCase() === q ? 0 : record.title.toLocaleLowerCase().startsWith(q) ? 1 : 2;
  return records.filter((record) => `${record.title} ${record.detail ?? ''}`.toLocaleLowerCase().includes(q))
    .sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title)).slice(0, limit);
}
