import { useState } from 'react';
import { Activity, Flame, Plus, Target, Trash2 } from 'lucide-react';
import { Button, Card, Empty, Field, Modal, PageHead, Ring, Stat, Stepper } from '@/components/ui';
import { currentWeekKeys, daysUntil, humanDate, lastNDays, todayKey } from '@/core/dates';
import { toast } from '@/components/Toast';
import { goalProgress, habitDone, habitStreak, useHealth, weeklyCompletion, type Habit, type HealthGoal } from './store';

export function HealthPage() {
  const { habits, logs, goals } = useHealth();
  const [newHabit, setNewHabit] = useState(false);
  const [newGoal, setNewGoal] = useState(false);
  const [editGoal, setEditGoal] = useState<string | null>(null);
  const list = Object.values(habits).filter((h) => !h.archived).sort((a, b) => a.order - b.order);
  const today = todayKey();
  const doneToday = list.filter((h) => habitDone(h, logs[h.id]?.[today])).length;
  const weekScore = list.length ? list.reduce((a, h) => a + Math.min(1, weeklyCompletion(h, logs[h.id])), 0) / list.length : 0;

  return (
    <div className="page">
      <PageHead eyebrow="Health" title="Body & energy" lead="Habits are the daily vote; goals are the direction. Log the small things and the trend takes care of itself."
        action={<><Button icon={Target} onClick={() => setNewGoal(true)}>New goal</Button><Button variant="primary" icon={Plus} onClick={() => setNewHabit(true)}>New habit</Button></>} />

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <Card tint="var(--health-soft)">
          <div className="row" style={{ gap: 18 }}>
            <Ring value={doneToday} max={Math.max(1, list.length)} color="var(--health)" label={`${doneToday}/${list.length}`} sub="today" size={88} />
            <div className="stack" style={{ gap: 4 }}>
              <h2 className="display">Today's check-in</h2>
              <span className="muted" style={{ fontSize: 13 }}>{doneToday === list.length && list.length ? 'All done. Rest is part of the plan.' : 'Tap a day to log it. Streaks forgive nothing but reward everything.'}</span>
            </div>
          </div>
        </Card>
        <Card title="7-day consistency" icon={Activity} accent="var(--health)">
          <div className="stats"><Stat value={`${Math.round(weekScore * 100)}%`} label="of intended days" /><Stat value={list.reduce((a, h) => Math.max(a, habitStreak(h, logs[h.id])), 0)} label="best streak" /></div>
        </Card>
        <Card title="Last 4 weeks" icon={Flame} accent="var(--health)">
          <Heatmap habits={list} logs={logs} />
        </Card>
      </div>

      <Card title="Habits" icon={Flame} accent="var(--health)">
        {!list.length ? (
          <Empty icon={Flame} title="No habits yet" hint="Start with one. Something so small you can't say no." action={<Button size="sm" onClick={() => setNewHabit(true)}>Add a habit</Button>} />
        ) : (
          <div className="list">{list.map((h) => <HabitRow key={h.id} habit={h} />)}</div>
        )}
      </Card>

      <div style={{ height: 16 }} />
      <Card title="Goals" icon={Target} accent="var(--health)">
        {!Object.keys(goals).length ? (
          <Empty icon={Target} title="No goals yet" hint="Pick one measurable outcome — weight, resting HR, weekly km." />
        ) : (
          <div className="grid cols-2">{Object.values(goals).map((g) => <GoalCard key={g.id} goal={g} onLog={() => setEditGoal(g.id)} />)}</div>
        )}
      </Card>

      <NewHabitModal open={newHabit} onClose={() => setNewHabit(false)} />
      <NewGoalModal open={newGoal} onClose={() => setNewGoal(false)} />
      <LogGoalModal id={editGoal} onClose={() => setEditGoal(null)} />
    </div>
  );
}

function HabitRow({ habit }: { habit: Habit }) {
  const { logs, toggleLog, incrementLog, deleteHabit } = useHealth();
  const log = logs[habit.id] ?? {};
  const week = currentWeekKeys();
  const today = todayKey();
  const streak = habitStreak(habit, log);
  const todayVal = log[today] ?? 0;
  return (
    <div className="habit-row">
      <div className="row" style={{ gap: 12 }}>
        <span style={{ fontSize: 22, width: 32, textAlign: 'center' }}>{habit.emoji}</span>
        <div className="grow">
          <div style={{ fontWeight: 500 }}>{habit.name}</div>
          <div className="faint" style={{ fontSize: 12 }}>
            {habit.kind === 'count' ? `${habit.target} ${habit.unit ?? ''} · ` : ''}{habit.daysPerWeek === 7 ? 'daily' : `${habit.daysPerWeek}×/week`}
            {streak > 0 && <> · <span className="streak"><Flame size={12} />{streak} day{streak === 1 ? '' : 's'}</span></>}
          </div>
        </div>
      </div>
      <div className="row" style={{ gap: 14 }}>
        {habit.kind === 'count' && (
          <Stepper value={todayVal} onChange={(v) => incrementLog(habit.id, v - todayVal)} unit={habit.unit} />
        )}
        <div className="habit-days" role="group" aria-label={`${habit.name} this week`}>
          {week.map((k) => {
            const on = habitDone(habit, log[k]);
            const future = k > today;
            return (
              <button key={k} className={`habit-day ${on ? 'on' : ''} ${k === today ? 'today' : ''}`} disabled={future} style={future ? { opacity: .35 } : undefined}
                title={`${humanDate(k)}${log[k] ? ` · ${log[k]}` : ''}`}
                onClick={() => (habit.kind === 'count' ? incrementLog(habit.id, on ? -log[k] : habit.target, k) : toggleLog(habit.id, k))}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'][week.indexOf(k)]}
              </button>
            );
          })}
        </div>
        <button className="btn ghost icon sm" aria-label="Delete habit" onClick={() => { if (confirm(`Delete “${habit.name}” and its history?`)) deleteHabit(habit.id); }}><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

function Heatmap({ habits, logs }: { habits: Habit[]; logs: Record<string, Record<string, number>> }) {
  const days = lastNDays(28);
  return (
    <div className="heat" aria-label="Habit completion heatmap">
      {days.map((k) => {
        const done = habits.filter((h) => habitDone(h, logs[h.id]?.[k])).length;
        const frac = habits.length ? done / habits.length : 0;
        const lvl = frac === 0 ? '' : frac < 0.5 ? 'l1' : frac < 1 ? 'l2' : 'l3';
        return <i key={k} className={lvl} title={`${humanDate(k)}: ${done}/${habits.length}`} />;
      })}
    </div>
  );
}

function GoalCard({ goal, onLog }: { goal: HealthGoal; onLog: () => void }) {
  const { current, fraction } = goalProgress(goal);
  const deleteGoal = useHealth((s) => s.deleteGoal);
  const left = goal.deadline ? daysUntil(goal.deadline) : undefined;
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="row" style={{ gap: 16 }}>
        <Ring value={fraction} size={76} stroke={7} color="var(--health)" label={<span style={{ fontSize: 22 }}>{goal.emoji}</span>} />
        <div className="grow">
          <div style={{ fontWeight: 600 }}>{goal.title}</div>
          <div className="muted" style={{ fontSize: 13 }}><b className="mono" style={{ color: 'var(--text)' }}>{current}</b> {goal.unit} → {goal.target} {goal.unit} <span className="faint">· {Math.round(fraction * 100)}%</span></div>
          {left !== undefined && <div className="faint" style={{ fontSize: 12 }}>{left >= 0 ? `${left} days left` : `${-left} days overdue`}</div>}
        </div>
        <div className="stack" style={{ gap: 4 }}>
          <Button size="sm" onClick={onLog}>Log</Button>
          <Button size="sm" variant="ghost" iconOnly icon={Trash2} aria-label="Delete goal" onClick={() => confirm('Delete goal?') && deleteGoal(goal.id)} />
        </div>
      </div>
    </div>
  );
}

function NewHabitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addHabit = useHealth((s) => s.addHabit);
  const [name, setName] = useState(''); const [emoji, setEmoji] = useState('💧'); const [kind, setKind] = useState<'check' | 'count'>('check');
  const [target, setTarget] = useState(8); const [unit, setUnit] = useState(''); const [days, setDays] = useState(7);
  const submit = () => { if (!name.trim()) return; addHabit({ name, emoji, kind, target, unit: unit || undefined, daysPerWeek: days }); toast(`Habit “${name}” added`); setName(''); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="New habit">
      <div className="form">
        <div className="form-row" style={{ gridTemplateColumns: '64px 1fr' }}>
          <Field label="Icon"><input value={emoji} onChange={(e) => setEmoji(e.target.value)} style={{ textAlign: 'center', fontSize: 20 }} /></Field>
          <Field label="Habit"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Drink water, Walk, Stretch, Sleep by 11" onKeyDown={(e) => e.key === 'Enter' && submit()} /></Field>
        </div>
        <div className="form-row">
          <Field label="Type"><select value={kind} onChange={(e) => setKind(e.target.value as 'check' | 'count')}><option value="check">Done / not done</option><option value="count">Count toward a target</option></select></Field>
          <Field label="Days per week"><select value={days} onChange={(e) => setDays(Number(e.target.value))}>{[7, 6, 5, 4, 3, 2, 1].map((d) => <option key={d} value={d}>{d === 7 ? 'Every day' : `${d} days`}</option>)}</select></Field>
        </div>
        {kind === 'count' && (
          <div className="form-row">
            <Field label="Daily target"><input type="number" min={1} value={target} onChange={(e) => setTarget(Number(e.target.value))} /></Field>
            <Field label="Unit"><input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="glasses, min, km" /></Field>
          </div>
        )}
        <div className="form-actions"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Add habit</Button></div>
      </div>
    </Modal>
  );
}

function NewGoalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addGoal = useHealth((s) => s.addGoal);
  const [title, setTitle] = useState(''); const [emoji, setEmoji] = useState('🎯'); const [unit, setUnit] = useState('lb');
  const [start, setStart] = useState(''); const [target, setTarget] = useState(''); const [deadline, setDeadline] = useState('');
  const submit = () => { if (!title.trim() || !start || !target) return; addGoal({ title, emoji, unit, start: Number(start), target: Number(target), deadline: deadline || undefined }); toast('Goal set'); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="New health goal">
      <div className="form">
        <div className="form-row" style={{ gridTemplateColumns: '64px 1fr' }}>
          <Field label="Icon"><input value={emoji} onChange={(e) => setEmoji(e.target.value)} style={{ textAlign: 'center', fontSize: 20 }} /></Field>
          <Field label="Goal"><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reach 175 lb, Run 5k under 25 min" /></Field>
        </div>
        <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <Field label="Now"><input type="number" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="Target"><input type="number" value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
          <Field label="Unit"><input value={unit} onChange={(e) => setUnit(e.target.value)} /></Field>
        </div>
        <Field label="Deadline (optional)"><input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
        <div className="form-actions"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Set goal</Button></div>
      </div>
    </Modal>
  );
}

function LogGoalModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { goals, logGoalEntry } = useHealth();
  const [value, setValue] = useState('');
  const goal = id ? goals[id] : undefined;
  if (!goal) return null;
  const submit = () => { if (!value) return; logGoalEntry(goal.id, Number(value)); toast(`Logged ${value} ${goal.unit}`); setValue(''); onClose(); };
  return (
    <Modal open onClose={onClose} title={`Log ${goal.title}`}>
      <div className="form">
        <Field label={`Today's value (${goal.unit})`}><input autoFocus type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} /></Field>
        <div className="faint" style={{ fontSize: 12.5 }}>Recent: {goal.entries.slice(-5).map((e) => `${e.value}`).join(' → ') || '—'}</div>
        <div className="form-actions"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Log</Button></div>
      </div>
    </Modal>
  );
}
