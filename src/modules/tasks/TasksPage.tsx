import { deleteWithUndo } from '@/core/undo';
import { Fragment, useMemo, useState, type DragEvent } from 'react';
import { Calendar, CheckSquare, Columns3, Flag, FolderPlus, Inbox, List, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button, CheckBox, Chip, DomainChip, Empty, Field, Modal, PageHead, Segmented } from '@/components/ui';
import { useUI } from '@/app/uiStore';
import { humanDate, isOverdue } from '@/core/dates';
import { parseQuickAdd } from '@/core/parse';
import { inLens, type Domain, type ID } from '@/core/types';
import { toast } from '@/components/Toast';
import { PALETTE, sortTasks, TASK_STATUSES, useTasks, type Priority, type Task, type TaskStatus } from './store';

type View = 'list' | 'board';
const PRIO_LABEL: Record<Priority, string> = { 0: 'None', 1: 'Low', 2: 'Medium', 3: 'High' };

export function TasksPage() {
  const lens = useUI((s) => s.lens);
  const { tasks, projects, addTask, ensureProject } = useTasks();
  const [view, setView] = useState<View>('list');
  const [projectFilter, setProjectFilter] = useState<ID | 'all'>('all');
  const [showDone, setShowDone] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<ID | null>(null);
  const [newProject, setNewProject] = useState(false);
  const [editingProject, setEditingProject] = useState<ID | null>(null);
  const [quick, setQuick] = useState('');

  const visible = useMemo(() => Object.values(tasks)
    .filter((t) => inLens(t.domain, lens))
    .filter((t) => projectFilter === 'all' || t.projectId === projectFilter)
    .sort(sortTasks), [tasks, lens, projectFilter]);

  const preview = quick.trim() ? parseQuickAdd(quick) : null;

  const submitQuick = () => {
    if (!preview?.title) return;
    const domain: Domain = preview.domain ?? (lens === 'business' ? 'business' : 'personal');
    const projectId = preview.project ? ensureProject(preview.project, domain).id : projectFilter !== 'all' ? projectFilter : undefined;
    addTask({ title: preview.title, domain, projectId, priority: preview.priority ?? 0, due: preview.due, tags: preview.tags, status: 'inbox' });
    setQuick('');
    toast(`Added “${preview.title}”`);
  };

  const lensProjects = Object.values(projects).filter((p) => inLens(p.domain, lens));
  const archivedCount = lensProjects.filter((p) => p.archived).length;
  const projectList = lensProjects.filter((p) => showArchived || !p.archived).sort((a, b) => Number(!!a.archived) - Number(!!b.archived));
  const openCount = visible.filter((t) => t.status !== 'done').length;
  // A filter pointing at a hidden project would quietly attach new tasks to it.
  if (projectFilter !== 'all' && !projectList.some((p) => p.id === projectFilter)) setProjectFilter('all');

  return (
    <div className="page">
      <PageHead
        eyebrow="Tasks"
        title={<>Commitments <span className="faint">· {openCount} open</span></>}
        lead="Capture fast, decide later. Inbox is for anything; Next is what you've committed to."
        action={<Segmented value={view} onChange={setView} options={[{ value: 'list', label: 'List', icon: List }, { value: 'board', label: 'Board', icon: Columns3 }]} />}
      />

      {/* Quick add */}
      <div className="quick-add">
        <Plus />
        <input
          className="grow"
          placeholder="Add a task… try “Renew passport @personal #admin !2 friday”"
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submitQuick(); }}
          aria-label="Quick add task"
        />
        {quick && <Button size="sm" variant="primary" onClick={submitQuick}>Add</Button>}
      </div>
      {preview && preview.title && (preview.domain || preview.project || preview.priority || preview.due || preview.tags.length > 0) && (
        <div className="hint-row">
          <span>Will create:</span>
          {preview.domain && <DomainChip domain={preview.domain} />}
          {preview.project && <Chip>#{preview.project}</Chip>}
          {preview.priority ? <Chip tone={preview.priority === 3 ? 'danger' : undefined} icon={Flag}>{PRIO_LABEL[preview.priority]}</Chip> : null}
          {preview.due && <Chip icon={Calendar}>{humanDate(preview.due)}</Chip>}
          {preview.tags.map((t) => <Chip key={t}>+{t}</Chip>)}
        </div>
      )}

      {/* Project filter */}
      <div className="row" style={{ margin: '18px 0 14px', flexWrap: 'wrap' }}>
        <button type="button" className={`chip clickable ${projectFilter === 'all' ? 'accent' : ''}`} aria-pressed={projectFilter === 'all'} onClick={() => setProjectFilter('all')}>All projects</button>
        {projectList.map((p) => (
          <Fragment key={p.id}>
            <button type="button" className={`chip clickable ${projectFilter === p.id ? 'accent' : ''}`} aria-pressed={projectFilter === p.id} style={p.archived ? { opacity: .6 } : undefined} onClick={() => setProjectFilter(p.id)}>
              <span className="dot" style={{ width: 7, height: 7, borderRadius: 4, background: p.color }} />{p.archived ? `${p.name} (archived)` : p.name}
            </button>
            {projectFilter === p.id && <button type="button" className="chip clickable" aria-label={`Edit project “${p.name}”`} onClick={() => setEditingProject(p.id)}><Pencil /></button>}
          </Fragment>
        ))}
        <button className="chip clickable" onClick={() => setNewProject(true)}><FolderPlus />New project</button>
        <span className="grow" />
        {archivedCount > 0 && (
          <label className="row faint" style={{ fontSize: 12.5, cursor: 'pointer' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived
          </label>
        )}
        <label className="row faint" style={{ fontSize: 12.5, cursor: 'pointer' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Show done
        </label>
      </div>

      {view === 'list' ? (
        <TaskList tasks={visible} showDone={showDone} onOpen={setEditing} />
      ) : (
        <Board tasks={visible} onOpen={setEditing} />
      )}

      <TaskEditor id={editing} onClose={() => setEditing(null)} />
      <NewProjectModal open={newProject} onClose={() => setNewProject(false)} defaultDomain={lens === 'business' ? 'business' : 'personal'} />
      <ProjectEditor key={editingProject} id={editingProject} onClose={() => setEditingProject(null)} />
    </div>
  );
}

/* ── List view: grouped by status ─────────────────────── */
function TaskList({ tasks, showDone, onOpen }: { tasks: Task[]; showDone: boolean; onOpen: (id: ID) => void }) {
  const groups = TASK_STATUSES.filter((s) => showDone || s.id !== 'done');
  if (!tasks.length) return <Empty icon={Inbox} title="Nothing here yet" hint="Add your first task above. Small steps count." />;
  return (
    <div className="stack" style={{ gap: 20 }}>
      {groups.map((g) => {
        const items = tasks.filter((t) => t.status === g.id);
        if (!items.length) return null;
        return (
          <section key={g.id}>
            <div className="row" style={{ marginBottom: 6, padding: '0 8px' }}>
              <h3 style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 12, color: 'var(--text-2)' }}>{g.label}</h3>
              <span className="faint" style={{ fontSize: 12 }}>{items.length}</span>
            </div>
            <div className="list card" style={{ padding: 6 }}>
              {items.map((t) => <TaskRow key={t.id} task={t} onOpen={() => onOpen(t.id)} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}

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
            {task.tags.map((t) => <Chip key={t}>+{t}</Chip>)}
          </div>
        )}
      </div>
      {compact && task.due && <Chip icon={Calendar} tone={isOverdue(task.due) ? 'danger' : undefined}>{humanDate(task.due)}</Chip>}
    </div>
  );
}

/* ── Board view with native drag & drop ───────────────── */
function Board({ tasks, onOpen }: { tasks: Task[]; onOpen: (id: ID) => void }) {
  const { moveTask, projects } = useTasks();
  const [over, setOver] = useState<TaskStatus | null>(null);
  const [dragging, setDragging] = useState<ID | null>(null);

  const onDrop = (e: DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/kaizen-task') || dragging;
    if (id) moveTask(id, status);
    setOver(null); setDragging(null);
  };

  return (
    <div className="board">
      {TASK_STATUSES.map((col) => {
        const items = tasks.filter((t) => t.status === col.id).sort((a, b) => a.order - b.order);
        return (
          <div key={col.id} className={`column ${over === col.id ? 'over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); if (over !== col.id) setOver(col.id); }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => onDrop(e, col.id)}>
            <div className="column-head"><span>{col.label}</span><span className="faint">{items.length}</span></div>
            {items.map((t) => {
              const project = t.projectId ? projects[t.projectId] : undefined;
              return (
                <div key={t.id} className={`tcard ${dragging === t.id ? 'dragging' : ''}`} draggable
                  onDragStart={(e) => { e.dataTransfer.setData('text/kaizen-task', t.id); setDragging(t.id); }}
                  onDragEnd={() => { setDragging(null); setOver(null); }}
                  onClick={() => onOpen(t.id)}>
                  <div className="row"><span className={`prio p${t.priority}`} /><span style={{ fontWeight: 500, textDecoration: t.status === 'done' ? 'line-through' : undefined }}>{t.title}</span></div>
                  <div className="meta row" style={{ flexWrap: 'wrap', gap: 5 }}>
                    <DomainChip domain={t.domain} />
                    {project && <span className="chip"><span style={{ width: 7, height: 7, borderRadius: 4, background: project.color }} />{project.name}</span>}
                    {t.due && <Chip icon={Calendar} tone={isOverdue(t.due) && t.status !== 'done' ? 'danger' : undefined}>{humanDate(t.due)}</Chip>}
                  </div>
                </div>
              );
            })}
            {!items.length && <div className="faint" style={{ fontSize: 12, textAlign: 'center', padding: 16 }}>Drop here</div>}
          </div>
        );
      })}
    </div>
  );
}

/* ── Editor ───────────────────────────────────────────── */
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
          <Field label="Due"><input type="date" value={task.due ?? ''} onChange={(e) => updateTask(task.id, { due: e.target.value || undefined })} /></Field>
          <Field label="Scheduled (work on it)"><input type="date" value={task.scheduled ?? ''} onChange={(e) => updateTask(task.id, { scheduled: e.target.value || undefined })} /></Field>
        </div>
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

function NewProjectModal({ open, onClose, defaultDomain }: { open: boolean; onClose: () => void; defaultDomain: Domain }) {
  const addProject = useTasks((s) => s.addProject);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState<Domain>(defaultDomain);
  const submit = () => { if (!name.trim()) return; addProject(name, domain); setName(''); onClose(); toast(`Project “${name}” created`); };
  return (
    <Modal open={open} onClose={onClose} title="New project">
      <div className="form">
        <Field label="Name"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }} placeholder="e.g. Q4 launch, Home renovation" /></Field>
        <Field label="Domain">
          <select value={domain} onChange={(e) => setDomain(e.target.value as Domain)}><option value="personal">Personal</option><option value="business">Business</option></select>
        </Field>
        <div className="form-actions"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit} disabled={!name.trim()}>Add project</Button></div>
      </div>
    </Modal>
  );
}

function ProjectEditor({ id, onClose }: { id: ID | null; onClose: () => void }) {
  const { tasks, projects, updateProject, deleteProject } = useTasks();
  const project = id ? projects[id] : undefined;
  const [name, setName] = useState(() => project?.name ?? '');
  const [domain, setDomain] = useState<Domain>(() => project?.domain ?? 'personal');
  const [color, setColor] = useState(() => project?.color ?? PALETTE[0]);
  if (!project) return null;
  const trimmed = name.trim();
  const duplicate = Object.values(projects).some((p) => p.id !== project.id && p.name.toLowerCase() === trimmed.toLowerCase());
  const count = Object.values(tasks).filter((t) => t.projectId === project.id).length;
  const submit = () => { if (!trimmed || duplicate) return; updateProject(project.id, { name: trimmed, domain, color }); onClose(); toast('Project updated'); };
  const setArchived = () => { updateProject(project.id, { archived: !project.archived }); onClose(); toast(`Project “${project.name}” ${project.archived ? 'restored' : 'archived'}`); };
  const remove = () => {
    const kept = count === 0 ? 'No tasks are assigned to it.' : count === 1 ? 'Its 1 task is kept and becomes unassigned.' : `Its ${count} tasks are kept and become unassigned.`;
    if (!confirm(`Delete project “${project.name}”? ${kept}`)) return;
    deleteProject(project.id); onClose(); toast(`Project “${project.name}” deleted`);
  };
  return (
    <Modal open onClose={onClose} title="Edit project">
      <div className="form">
        <Field label="Name"><input autoFocus maxLength={120} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }} /></Field>
        {duplicate && <span className="muted">A project named “{trimmed}” already exists</span>}
        <Field label="Domain">
          <select value={domain} onChange={(e) => setDomain(e.target.value as Domain)}><option value="personal">Personal</option><option value="business">Business</option></select>
        </Field>
        <div className="stack" style={{ gap: 5 }}>
          <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>Color</span>
          <div className="row" role="group" aria-label="Color" style={{ flexWrap: 'wrap' }}>
            {PALETTE.map((hex) => (
              <button key={hex} type="button" aria-label={`Color ${hex}`} aria-pressed={hex === color} onClick={() => setColor(hex)}
                style={{ width: 26, height: 26, borderRadius: 999, background: hex, border: '1px solid var(--border)', boxShadow: hex === color ? '0 0 0 2px var(--bg-elev), 0 0 0 4px var(--accent)' : undefined }} />
            ))}
          </div>
        </div>
        <div className="form-actions">
          <Button variant="ghost" onClick={setArchived}>{project.archived ? 'Unarchive project' : 'Archive project'}</Button>
          <Button variant="ghost" className="danger" icon={Trash2} onClick={remove}>Delete project</Button>
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!trimmed || duplicate}>Save changes</Button>
        </div>
      </div>
    </Modal>
  );
}
