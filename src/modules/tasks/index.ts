import { CheckSquare, Plus } from 'lucide-react';
import type { KaizenModule } from '@/app/modules';
import { parseQuickAdd } from '@/core/parse';
import { toast } from '@/components/Toast';
import { TasksPage } from './TasksPage';
import { FocusWidget } from './widgets';
import { useTasks } from './store';

export const tasksModule: KaizenModule = {
  id: 'tasks', name: 'Tasks', tagline: 'Personal & business commitments', icon: CheckSquare, path: '/tasks', Page: TasksPage,
  widgets: [{ id: 'focus', order: 10, size: 'span-1', Component: FocusWidget }],
  quickActions: [{
    id: 'add-task', label: 'Add task', hint: 'e.g. “Call Dana @business !2 friday”', icon: Plus, acceptsInput: true, keywords: ['todo', 'new task'],
    run: (input) => {
      const p = parseQuickAdd(input); if (!p.title) return;
      const { addTask, ensureProject } = useTasks.getState();
      const domain = p.domain ?? 'personal';
      addTask({ title: p.title, domain, priority: p.priority ?? 0, due: p.due, tags: p.tags, projectId: p.project ? ensureProject(p.project, domain).id : undefined });
      toast(`Added “${p.title}”`);
    },
  }],
};
