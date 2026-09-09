import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportAll, importAll, inspectBackup } from '@/core/store';
import { useTasks } from './store';

beforeEach(() => { useTasks.setState({ tasks: {}, projects: {} }); });
afterEach(() => { vi.useRealTimers(); });

describe('projects', () => {
  it('renames a project, stamps updatedAt, and ignores unknown ids', () => {
    const project = useTasks.getState().addProject('Website', 'personal');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-04T05:06:07.008Z'));
    useTasks.getState().updateProject(project.id, { name: 'Relaunch', color: '#9ece6a' });
    const renamed = useTasks.getState().projects[project.id];
    expect(renamed.name).toBe('Relaunch');
    expect(renamed.color).toBe('#9ece6a');
    expect(renamed.domain).toBe('personal');
    expect(renamed.updatedAt).toBe('2026-03-04T05:06:07.008Z');
    useTasks.getState().updateProject('nope', { name: 'Ghost' });
    expect(Object.keys(useTasks.getState().projects)).toEqual([project.id]);
    expect(useTasks.getState().projects.nope).toBeUndefined();
  });

  it('reuses and restores an archived project instead of creating a duplicate', () => {
    const project = useTasks.getState().addProject('Website', 'personal');
    useTasks.getState().updateProject(project.id, { archived: true });
    const found = useTasks.getState().ensureProject('website', 'personal');
    expect(found.id).toBe(project.id);
    expect(found.name).toBe('Website');
    expect(found.archived).toBe(false);
    expect(Object.keys(useTasks.getState().projects)).toHaveLength(1);
  });

  it('keeps tasks when their project is deleted', () => {
    const project = useTasks.getState().addProject('Website', 'personal');
    const assigned = useTasks.getState().addTask({ title: 'Fix nav', projectId: project.id });
    const loose = useTasks.getState().addTask({ title: 'Ship it' });
    useTasks.getState().deleteProject(project.id);
    expect(useTasks.getState().projects[project.id]).toBeUndefined();
    expect(useTasks.getState().tasks[assigned.id].title).toBe('Fix nav');
    expect(useTasks.getState().tasks[assigned.id].projectId).toBeUndefined();
    expect(useTasks.getState().tasks[loose.id]).toBeDefined();
  });

  it('round-trips an archived project through a backup', () => {
    const project = useTasks.getState().addProject('Website', 'personal');
    useTasks.getState().updateProject(project.id, { archived: true });
    const backup = JSON.parse(JSON.stringify(exportAll()));
    expect(() => inspectBackup(backup)).not.toThrow();
    useTasks.setState({ tasks: {}, projects: {} });
    importAll(backup);
    expect(useTasks.getState().projects[project.id].archived).toBe(true);
    expect(useTasks.getState().projects[project.id].name).toBe('Website');
  });
});
