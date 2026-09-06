import { createPersistedStore, registerStore } from '@/core/store';
import { newId, nowIso } from '@/core/ids';
import type { BaseEntity, DateKey, Domain, ID } from '@/core/types';

export type TaskStatus = 'inbox' | 'next' | 'doing' | 'waiting' | 'done';
export const TASK_STATUSES: { id: TaskStatus; label: string }[] = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'next', label: 'Next' },
  { id: 'doing', label: 'Doing' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'done', label: 'Done' },
];
export type Priority = 0 | 1 | 2 | 3;

export interface Project extends BaseEntity {
  name: string;
  domain: Domain;
  color: string;
  archived?: boolean;
}

export interface Subtask { id: ID; title: string; done: boolean }

export interface Task extends BaseEntity {
  title: string;
  notes?: string;
  domain: Domain;
  projectId?: ID;
  status: TaskStatus;
  priority: Priority;
  due?: DateKey;
  scheduled?: DateKey;
  completedAt?: string;
  tags: string[];
  subtasks: Subtask[];
  /** Position within its status column (kanban ordering). */
  order: number;
}

export type TaskInput = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> & { title: string };

interface TasksState {
  tasks: Record<ID, Task>;
  projects: Record<ID, Project>;
  addTask: (input: TaskInput) => Task;
  updateTask: (id: ID, patch: Partial<Task>) => void;
  deleteTask: (id: ID) => void;
  toggleDone: (id: ID) => void;
  moveTask: (id: ID, status: TaskStatus, index?: number) => void;
  toggleSubtask: (taskId: ID, subId: ID) => void;
  addSubtask: (taskId: ID, title: string) => void;
  addProject: (name: string, domain: Domain, color?: string) => Project;
  updateProject: (id: ID, patch: Partial<Project>) => void;
  deleteProject: (id: ID) => void;
  /** Find or create a project by name (used by quick-add's #project token). */
  ensureProject: (name: string, domain: Domain) => Project;
}

const PALETTE = ['#7aa2f7', '#9ece6a', '#bb9af7', '#f7768e', '#7dcfff', '#e0af68', '#ff9e64', '#73daca'];

export const useTasks = createPersistedStore<TasksState>('tasks', 1, (set, get) => ({
  tasks: {},
  projects: {},

  addTask: (input) => {
    const now = nowIso();
    const status = input.status ?? 'inbox';
    const siblings = Object.values(get().tasks).filter((t) => t.status === status);
    const task: Task = {
      id: newId(), createdAt: now, updatedAt: now,
      title: input.title.trim(), notes: input.notes, domain: input.domain ?? 'personal',
      projectId: input.projectId, status, priority: input.priority ?? 0,
      due: input.due, scheduled: input.scheduled, completedAt: input.completedAt ?? (status === 'done' ? now : undefined), tags: input.tags ?? [], subtasks: input.subtasks ?? [],
      order: siblings.length ? Math.min(...siblings.map((s) => s.order)) - 1 : 0,
    };
    set((s) => ({ tasks: { ...s.tasks, [task.id]: task } }));
    return task;
  },

  updateTask: (id, patch) => set((s) => {
    const t = s.tasks[id]; if (!t) return s;
    return { tasks: { ...s.tasks, [id]: { ...t, ...patch, updatedAt: nowIso() } } };
  }),

  deleteTask: (id) => set((s) => { const { [id]: _, ...rest } = s.tasks; return { tasks: rest }; }),

  toggleDone: (id) => {
    const t = get().tasks[id]; if (!t) return;
    if (t.status === 'done') get().updateTask(id, { status: 'next', completedAt: undefined });
    else get().updateTask(id, { status: 'done', completedAt: nowIso() });
  },

  moveTask: (id, status, index) => set((s) => {
    const t = s.tasks[id]; if (!t) return s;
    const column = Object.values(s.tasks).filter((x) => x.status === status && x.id !== id).sort((a, b) => a.order - b.order);
    const at = index === undefined ? column.length : Math.max(0, Math.min(index, column.length));
    column.splice(at, 0, { ...t, status });
    const tasks = { ...s.tasks };
    column.forEach((x, i) => { tasks[x.id] = { ...x, order: i, updatedAt: nowIso(), ...(x.id === id ? { completedAt: status === 'done' ? nowIso() : undefined } : {}) }; });
    return { tasks };
  }),

  toggleSubtask: (taskId, subId) => {
    const t = get().tasks[taskId]; if (!t) return;
    get().updateTask(taskId, { subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)) });
  },
  addSubtask: (taskId, title) => {
    const t = get().tasks[taskId]; if (!t || !title.trim()) return;
    get().updateTask(taskId, { subtasks: [...t.subtasks, { id: newId(), title: title.trim(), done: false }] });
  },

  addProject: (name, domain, color) => {
    const now = nowIso();
    const count = Object.keys(get().projects).length;
    const p: Project = { id: newId(), createdAt: now, updatedAt: now, name: name.trim(), domain, color: color ?? PALETTE[count % PALETTE.length] };
    set((s) => ({ projects: { ...s.projects, [p.id]: p } }));
    return p;
  },
  updateProject: (id, patch) => set((s) => ({ projects: { ...s.projects, [id]: { ...s.projects[id], ...patch, updatedAt: nowIso() } } })),
  deleteProject: (id) => set((s) => {
    const { [id]: _, ...projects } = s.projects;
    const tasks = Object.fromEntries(Object.entries(s.tasks).map(([k, t]) => [k, t.projectId === id ? { ...t, projectId: undefined } : t]));
    return { projects, tasks };
  }),
  ensureProject: (name, domain) => {
    const existing = Object.values(get().projects).find((p) => p.name.toLowerCase() === name.toLowerCase());
    return existing ?? get().addProject(name, domain);
  },
}));
registerStore('tasks', useTasks);

/* ── Selectors (pure helpers) ─────────────────────────── */
export const sortTasks = (a: Task, b: Task) => {
  if (a.status !== b.status) return 0;
  if (b.priority !== a.priority) return b.priority - a.priority;
  if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
  if (a.due && !b.due) return -1;
  if (!a.due && b.due) return 1;
  return a.order - b.order;
};
