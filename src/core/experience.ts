/** A presentation preference, never an authorization or subscription boundary. */
export type Experience = 'full' | 'bookshelf';
export const EXPERIENCE_METADATA_KEY = 'kaizenExperience';
export function resolveExperience(value: unknown, fallback: Experience = 'full'): Experience {
  return value === 'bookshelf' || value === 'full' ? value : fallback;
}
export function experienceHome(experience: Experience): string { return experience === 'bookshelf' ? '/library' : '/'; }
const bookshelfAreas = new Set(['library', 'reading', 'reading-journal', 'settings']);
export function areaVisible(id: string, experience: Experience): boolean {
  return experience === 'bookshelf' ? bookshelfAreas.has(id) : !['reading', 'reading-journal'].includes(id);
}
