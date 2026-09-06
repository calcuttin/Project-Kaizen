import { useMemo, useState } from 'react';
import { ArrowRight, CheckSquare, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, Empty } from '@/components/ui';
import { useUI } from '@/app/uiStore';
import { todayKey } from '@/core/dates';
import { parseQuickAdd } from '@/core/parse';
import { inLens } from '@/core/types';
import { sortTasks, useTasks } from './store';
import { TaskEditor, TaskRow } from './TasksPage';

/** Today's focus: overdue + due today + scheduled today + in-progress, then top priorities to fill. */
export function FocusWidget() {
  const lens = useUI((s) => s.lens);
  const { tasks, addTask, ensureProject } = useTasks();
  const [editing, setEditing] = useState<string | null>(null);
  const [quick, setQuick] = useState('');
  const today = todayKey();

  const focus = useMemo(() => {
    const open = Object.values(tasks).filter((t) => t.status !== 'done' && inLens(t.domain, lens));
    const urgent = open.filter((t) => (t.due && t.due <= today) || t.scheduled === today || t.status === 'doing').sort(sortTasks);
    const rest = open.filter((t) => !urgent.includes(t) && t.status === 'next').sort(sortTasks);
    return [...urgent, ...rest].slice(0, 7);
  }, [tasks, lens, today]);
  const doneToday = Object.values(tasks).filter((t) => t.completedAt?.startsWith(today) && inLens(t.domain, lens)).length;

  const submit = () => {
    const p = parseQuickAdd(quick); if (!p.title) return;
    const domain = p.domain ?? (lens === 'business' ? 'business' : 'personal');
    addTask({ title: p.title, domain, priority: p.priority ?? 0, due: p.due ?? today, tags: p.tags, status: 'next', projectId: p.project ? ensureProject(p.project, domain).id : undefined });
    setQuick('');
  };

  return (
    <Card title="Today's tasks" icon={CheckSquare} action={<Link to="/tasks" style={{ color: 'var(--text-2)', fontSize: 12 }}>All tasks <ArrowRight size={11} style={{ verticalAlign: '-1px' }} /></Link>}>
      <p className="today-helper" style={{ marginBottom: 12 }}>{doneToday ? `${doneToday} completed today. ` : ''}Due, overdue, and next tasks appear here.</p>
      <form className="quick-add today-entry" style={{ marginBottom: 14 }} onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input placeholder="What needs doing?" value={quick} onChange={(e) => setQuick(e.target.value)} aria-label="Quick add for today" />
        <Button type="submit" variant="primary" size="sm" icon={Plus} disabled={!quick.trim()}>Add task</Button>
      </form>
      {focus.length ? (
        <div className="list">{focus.map((t) => <TaskRow key={t.id} task={t} compact onOpen={() => setEditing(t.id)} />)}</div>
      ) : (
        <Empty icon={CheckSquare} title="Room for a fresh start" hint="Add a task above, or choose one from All tasks." />
      )}
      <TaskEditor id={editing} onClose={() => setEditing(null)} />
    </Card>
  );
}
