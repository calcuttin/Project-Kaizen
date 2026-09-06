import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportAll, importAll, inspectBackup } from './store';
import { useTasks } from '@/modules/tasks/store';
import { seedSampleData } from '@/modules/settings/seed';
import { useStudio } from '@/modules/studio/store';
import { useImports } from '@/core/imports/store';
import { useLibrary } from '@/modules/library/store';
import { deleteWithUndo } from './undo';
const workspace = vi.hoisted(() => ({ owner: 'a', available: true }));
vi.mock('./storage', async (original) => ({ ...await original<object>(), currentWorkspaceOwner: () => workspace.owner, workspaceAvailable: () => workspace.available }));
vi.mock('@/components/Toast', () => ({ toast: vi.fn() }));

beforeEach(() => {
  workspace.owner = 'a'; workspace.available = true;
  useTasks.setState({ tasks: {}, projects: {} });
  useLibrary.setState({ books: {}, shelves: {}, sessions: [], annotations: {} });
});
describe('backup recovery', () => {
  it('accepts an export with every current module and sample records', () => {
    seedSampleData();
    const channel = useStudio.getState().addChannel({ name: 'Test channel', kind: 'newsletter' });
    useStudio.getState().addPiece({ channelId: channel.id, title: 'Test piece' });
    useStudio.getState().logSnapshot(channel.id, { readers: 10 });
    useImports.getState().record({ adapter: 'csv', fileName: 'test.csv', created: 1, skipped: 0, warningCount: 0, createdBookIds: [], createdAnnotationIds: [] });
    const backup = JSON.parse(JSON.stringify(exportAll()));
    expect(inspectBackup(backup)).toHaveLength(7);
    importAll(backup);
    expect(JSON.parse(JSON.stringify(exportAll())).stores).toEqual(backup.stores);
  });
  it('round-trips actual tasks, books, notes and reading sessions', () => {
    const task = useTasks.getState().addTask({ title: 'Plan', notes: 'Keep this', subtasks: [{ id: 'sub', title: 'First', done: true }] });
    const book = useLibrary.getState().addBook({ title: 'Test book', author: 'Test author', pages: 100 });
    useLibrary.getState().logProgress(book.id, 10);
    const backup = JSON.parse(JSON.stringify(exportAll()));
    expect(inspectBackup(backup).find((item) => item.name === 'library')?.collections).toContainEqual({ name: 'books', count: 1 });
    useTasks.getState().deleteTask(task.id); useLibrary.getState().deleteBook(book.id);
    importAll(backup);
    expect(JSON.parse(JSON.stringify(exportAll())).stores).toEqual(backup.stores);
  });
  it('validates all areas before changing any records and protects store actions', () => {
    const task = useTasks.getState().addTask({ title: 'Preserve me' });
    expect(() => importAll({ app: 'kaizen', stores: { tasks: { tasks: {} }, library: { books: { broken: { id: 'broken', title: 12 } } } } })).toThrow('Invalid backup');
    expect(useTasks.getState().tasks[task.id].title).toBe('Preserve me');
    expect(() => importAll({ app: 'kaizen', stores: { tasks: { addTask: null } } })).toThrow('Unsupported');
    expect(typeof useTasks.getState().addTask).toBe('function');
    expect(() => importAll(JSON.parse('{"app":"kaizen","stores":{"tasks":{"tasks":{},"__proto__":{}}}}'))).toThrow('Unsafe');
  });
});
describe('undo deletion', () => {
  it('restores a book and its dependent records without reverting other edits', () => {
    const book = useLibrary.getState().addBook({ title: 'Deleted', author: 'A' });
    const other = useLibrary.getState().addBook({ title: 'Other', author: 'B' });
    useLibrary.getState().logProgress(book.id, 20);
    useLibrary.getState().addAnnotation({ bookId: book.id, content: 'A note', kind: 'note' });
    const undo = deleteWithUndo(useLibrary, () => useLibrary.getState().deleteBook(book.id), 'Deleted');
    useLibrary.getState().updateBook(other.id, { title: 'Edited later' });
    undo();
    expect(useLibrary.getState().books[book.id].title).toBe('Deleted');
    expect(useLibrary.getState().books[other.id].title).toBe('Edited later');
    expect(useLibrary.getState().sessions).toHaveLength(1);
    expect(Object.values(useLibrary.getState().annotations)).toHaveLength(1);
    undo(); expect(useLibrary.getState().sessions).toHaveLength(1);
  });
  it('does not restore into another account or a locked workspace', () => {
    const task = useTasks.getState().addTask({ title: 'Private' });
    const undo = deleteWithUndo(useTasks, () => useTasks.getState().deleteTask(task.id), 'Deleted');
    workspace.owner = 'b'; undo(); expect(useTasks.getState().tasks).toEqual({});
    workspace.owner = 'a'; workspace.available = false; undo(); expect(useTasks.getState().tasks).toEqual({});
  });
});
