import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { cabinetSettings, DEFAULT_CABINET } from './cabinet';
import { useLibrary } from './store';
import { exportAll, importAll } from '@/core/store';

describe('cabinet preferences', () => {
  it('keeps legacy shelves usable and clamps invalid brightness', () => {
    expect(cabinetSettings()).toEqual(DEFAULT_CABINET);
    expect(cabinetSettings({ brightness: Infinity }).brightness).toBe(85);
    expect(cabinetSettings({ brightness: -1 }).brightness).toBe(35);
    expect(cabinetSettings({ brightness: 200 }).brightness).toBe(100);
  });
  it('round-trips a curated shelf through backup without changing another shelf', () => {
    const shelf = useLibrary.getState().addShelf('Test cabinet', 'research');
    const other = useLibrary.getState().addShelf('Other cabinet', 'tech');
    const settings = { lighting: 'moonlight' as const, layout: 'balanced' as const, brightness: 65 };
    useLibrary.getState().setShelfCabinet(shelf.id, settings);
    useLibrary.getState().setShelfObjects(shelf.id, ['bust', 'lantern']);
    const backup = JSON.parse(JSON.stringify(exportAll()));
    useLibrary.getState().setShelfCabinet(shelf.id, undefined);
    importAll(backup);
    expect(useLibrary.getState().shelves[shelf.id].cabinet).toEqual(settings);
    expect(useLibrary.getState().shelves[shelf.id].objects).toEqual(['bust', 'lantern']);
    expect(useLibrary.getState().shelves[other.id].cabinet).toBeUndefined();
    const invalid = JSON.parse(JSON.stringify(backup));
    invalid.stores.library.shelves[shelf.id].cabinet.brightness = 500;
    expect(() => importAll(invalid)).toThrow('Invalid backup');
    expect(useLibrary.getState().shelves[shelf.id].cabinet).toEqual(settings);
  });
});
