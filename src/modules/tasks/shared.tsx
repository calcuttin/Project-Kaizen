import { deleteWithUndo } from '@/core/undo';
import { useState } from 'react';
import { Calendar, CheckSquare, Trash2, X } from 'lucide-react';
import { Button, CheckBox, Chip, DomainChip, Field, Modal } from '@/components/ui';
import { humanDate, isOverdue, todayKey } from '@/core/dates';
import { type Domain, type ID } from '@/core/types';
import type { Recurrence } from './recurrence';
import { TASK_STATUSES, useTasks, type Priority, type Task, type TaskStatus } from './store';

const PRIO_LABEL: Record<Priority, string> = { 0: 'None', 1: 'Low', 2: 'Medium', 3: 'High' };

export function TaskRow({ task, onOpen, compact }: { task: Task; onOpen: () => void; compact?: boolean }) {
  const { toggleDone, projects } = useTasks();
  const project = task.projectId ? projects[task.projectId] : undefined;
  const subDone = task.subtasks.filter((s) => s.done).length;
  return (
    <div className={`list-item ${task.status === 'done' ? 'done' : ''}`} onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}>
      <span className={`prio p${task.priority}`} />
      <CheckBox on={task.status === 'done'} onToggle={() => toggleDone(task.id)} />
      <div className="grow">
        <div className="title truncate">{task.title}</div>
        {!compact && (
          <div className="meta">
            <DomainChip domain={task.domain} />
            {project && <span className="chip"><span style={{ width: 7, height: 7, borderRadius: 4, background: project.color }} />{project.name}</span>}
            {task.due && <Chip icon={Calendar} tone={isOverdue(task.due) && task.status !== 'done' ? 'danger' : undefined}>{humanDate(task.due)}</Chip>}
            {task.subtasks.length > 0 && <Chip icon={CheckSquare}>{subDone}/{task.subtasks.length}</Chip>}
            {task.recurrence && <Chip>Repeats {task.recurrence.frequency}</Chip>}
            {task.tags.map((t) => <Chip key={t}>+{t}</Chip>)}
          </div>
        )}
      </div>
      {compact && task.due && <Chip icon={Calendar} tone={isOverdue(task.due) ? 'danger' : undefined}>{humanDate(task.due)}</Chip>}
    </div>
  );
}

export function TaskEditor({ id, onClose }: { id: ID | null; onClose: () => void }) {
  const { tasks, projects, updateTask, deleteTask, toggleSubtask, addSubtask } = useTasks();
  const task = id ? tasks[id] : undefined;
  const [sub, setSub] = useState('');
  if (!task) return null;
  const projectOptions = Object.values(projects).filter((p) => !p.archived || p.id === task.projectId);
  return (
    <Modal open onClose={onClose} title="Task">
      <div className="form">
        <input value={task.title} onChange={(e) => updateTask(task.id, { title: e.target.value })} style={{ fontSize: 17, fontWeight: 500 }} aria-label="Title" />
        <div className="form-row">
          <Field label="Domain">
            <select value={task.domain} onChange={(e) => updateTask(task.id, { domain: e.target.value as Domain })}>
              <option value="personal">Personal</option><option value="business">Business</option>
            </select>
          </Field>
          <Field label="Project">
            <select value={task.projectId ?? ''} onChange={(e) => updateTask(task.id, { projectId: e.target.value || undefined })}>
              <option value="">None</option>
              {projectOptions.map((p) => <option key={p.id} value={p.id}>{p.archived ? `${p.name} (archived)` : p.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Status">
            <select value={task.status} onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus })}>
              {TASK_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select value={task.priority} onChange={(e) => updateTask(task.id, { priority: Number(e.target.value) as Priority })}>
              {[0, 1, 2, 3].map((p) => <option key={p} value={p}>{PRIO_LABEL[p as Priority]}</option>)}
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Due"><input type="date" value={task.due ?? ''} onChange={(e) => updateTask(task.id, { due: e.target.value || undefined, recurrence: e.target.value && task.recurrence ? { ...task.recurrence, anchorDay: Number(e.target.value.slice(-2)) } : undefined })} /></Field>
          <Field label="Scheduled (work on it)"><input type="date" value={task.scheduled ?? ''} onChange={(e) => updateTask(task.id, { scheduled: e.target.value || undefined })} /></Field>
        </div>
        <Field label="Repeat">
          <select disabled={task.status === 'done' || !!task.nextOccurrenceId} value={task.recurrence?.frequency ?? ''} onChange={(e) => {
            const due = task.due || todayKey();
            updateTask(task.id, { due: e.target.value ? due : task.due, recurrence: e.target.value ? { frequency: e.target.value as Recurrence['frequency'], anchorDay: Number(due.slice(-2)) } : undefined });
          }}><option value="">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select>
        </Field>
        {(task.recurrence || task.nextOccurrenceId) && <p className="muted">{task.nextOccurrenceId ? 'The next occurrence has already been created. Edit that task to change or stop the series; reopening this task will not create another copy.' : 'Completing this task creates one next occurrence after today, using its due-date schedule. Missed dates are skipped. Monthly repeats keep the original day, using the last day in shorter months. Clearing the due date stops repeating.'}</p>}
        <Field label="Notes"><textarea value={task.notes ?? ''} onChange={(e) => updateTask(task.id, { notes: e.target.value })} placeholder="Context, links, next physical action…" /></Field>
        <Field label="Steps">
          <div className="list">
            {task.subtasks.map((s) => (
              <div key={s.id} className={`list-item ${s.done ? 'done' : ''}`} style={{ padding: '6px 4px' }}>
                <CheckBox on={s.done} onToggle={() => toggleSubtask(task.id, s.id)} round />
                <span className="title grow">{s.title}</span>
                <button className="btn ghost icon sm" aria-label="Remove step" onClick={() => updateTask(task.id, { subtasks: task.subtasks.filter((x) => x.id !== s.id) })}><X size={14} /></button>
              </div>
            ))}
            <input placeholder="Add a step and press Enter" value={sub} onChange={(e) => setSub(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { addSubtask(task.id, sub); setSub(''); } }} />
          </div>
        </Field>
        <div className="form-actions">
          <span className="muted">Changes save automatically.</span><Button variant="ghost" className="danger" icon={Trash2} onClick={() => { deleteWithUndo(useTasks, () => deleteTask(task.id), 'Task deleted'); onClose(); }}>Delete task</Button>
          <span className="grow" />
          <Button variant="primary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

