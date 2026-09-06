import { useMemo, useState } from 'react';
import { ArrowRight, CheckSquare, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Empty } from '@/components/ui';
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
    <Card title="Focus" icon={CheckSquare} action={<span className="faint" style={{ fontSize: 12 }}>{doneToday} done today · <Link to="/tasks" style={{ color: 'var(--text-2)' }}>All tasks <ArrowRight size={11} style={{ verticalAlign: '-1px' }} /></Link></span>}>
      {focus.length ? (
        <div className="list">{focus.map((t) => <TaskRow key={t.id} task={t} compact onOpen={() => setEditing(t.id)} />)}</div>
      ) : (
        <Empty icon={CheckSquare} title="Clear runway" hint="Nothing due or scheduled. Pick one thing worth doing." />
      )}
      <div className="quick-add" style={{ marginTop: 10, padding: '7px 10px' }}>
        <Plus />
        <input placeholder="Add for today… “Email Sam @business !2”" value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} aria-label="Quick add for today" />
      </div>
      <TaskEditor id={editing} onClose={() => setEditing(null)} />
    </Card>
  );
}
