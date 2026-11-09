import { describe, expect, it } from 'vitest';
import { areaVisible, experienceHome, resolveExperience } from './experience';
describe('one account, two experiences', () => {
  it('defaults existing accounts to full and accepts only known preferences', () => {
    expect(resolveExperience(undefined)).toBe('full');
    expect(resolveExperience('bookshelf')).toBe('bookshelf');
    expect(resolveExperience('admin')).toBe('full');
    expect(resolveExperience({ role:'admin' }, 'bookshelf')).toBe('bookshelf');
  });
  it('opens the correct home and keeps unrelated routes out of Bookshelf', () => {
    expect(experienceHome('bookshelf')).toBe('/library');
    for (const id of ['library','reading','reading-journal','settings']) expect(areaVisible(id,'bookshelf')).toBe(true);
    for (const id of ['tasks','today','health','studio','feed']) expect(areaVisible(id,'bookshelf')).toBe(false);
    expect(areaVisible('tasks','full')).toBe(true);
    expect(areaVisible('reading','full')).toBe(false);
  });
});
