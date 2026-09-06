import { config } from '@/core/config';
import { useSyncStatus } from '@/core/sync/engine';
import { useEffect, useState, type CSSProperties } from 'react';
import { BookOpen, CircleDot, HelpCircle, Heart, Moon, Plus, Sparkles, Sun, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, Modal } from '@/components/ui';
import { format, greeting, todayKey } from '@/core/dates';
import { modules } from '@/app/registry';
import { MOODS, useJournal } from '@/modules/journal/store';
import { FocusWidget } from '@/modules/tasks/widgets';
import { TODAY_LABELS, TODAY_SECTIONS, useUI } from '@/app/uiStore';
import { useTasks } from '@/modules/tasks/store';
import { useHealth } from '@/modules/health/store';
import { useLibrary } from '@/modules/library/store';
import { useImports } from '@/core/imports/store';
import { registeredStores, whenHydrated } from '@/core/store';
import './today.css';

export function TodayPage() {
  const { todayOrder, todayHidden, setTodayLayout } = useUI();
  const [customizing, setCustomizing] = useState(false);
  const order = [...new Set([...todayOrder, ...TODAY_SECTIONS])].filter((id) => TODAY_SECTIONS.includes(id));
  const move = (id: string, direction: number) => { const next = [...order]; const i = next.indexOf(id); [next[i], next[i + direction]] = [next[i + direction], next[i]]; setTodayLayout(next, todayHidden); };
  const today = todayKey();
  const { entries, upsert, addWin, removeWin } = useJournal();
  const entry = entries[today];
  const [win, setWin] = useState('');
  const widgets = modules.flatMap((m) => m.widgets ?? []).filter((w) => w.id !== 'focus').sort((a, b) => a.order - b.order);
  const evening = new Date().getHours() >= 17;
  const ritualTotal = evening ? 4 : 3;
  const ritualComplete = [Boolean(entry?.intention?.trim()), Boolean(entry?.mood), Boolean(entry?.wins?.length), evening && Boolean(entry?.reflection?.trim())].filter(Boolean).length;
  const ritualPct = Math.round((ritualComplete / ritualTotal) * 100);

  return (
    <div className="page today-page">
      <header className="today-masthead">
        <div>
          <div className="eyebrow">Today · {format(new Date(), 'EEEE, MMMM d')}</div>
          <h1>{greeting()}<span>.</span></h1>
          <p>Choose one thing to do, then pick up where you left off.</p>
        </div>
        <div className="today-rhythm" aria-label={`${ritualComplete} of ${ritualTotal} daily check-ins complete`}>
          <div className="rhythm-orbit" style={{ '--ritual': `${ritualPct}%` } as CSSProperties}><b>{ritualComplete}</b><small>of {ritualTotal}</small></div>
          <div><span className="rhythm-label"><CircleDot /> Daily check-in</span><strong>{ritualComplete === ritualTotal ? 'All checked in' : 'At your own pace'}</strong></div>
        </div>
      </header>

      <nav className="today-shortcuts" aria-label="Today shortcuts">
        <Link className="btn" to="/library"><BookOpen size={16} />Open library</Link>
        <Link className="btn" to="/health"><Heart size={16} />Track habits</Link>
        <a className="btn ghost" href="/guides/using-kaizen.html"><HelpCircle size={16} />Getting started</a>
        <Button variant="ghost" onClick={() => setCustomizing(true)}>Customize Today</Button>
      </nav>
      <GettingStarted />

      <section className="today-ritual" aria-label="Plan your day">
        {!todayHidden.includes('tasks') && <FocusWidget />}
        {!todayHidden.includes('intention') && <Card className="intention today-intention" tint="var(--accent-soft)">
          <div className="today-card-kicker"><h2 className="card-title"><Sparkles /> Your daily focus</h2><em>Optional</em></div>
          <label className="today-field-label" htmlFor="daily-intention">What would make today a good day?</label>
          <textarea
            id="daily-intention"
            value={entry?.intention ?? ''}
            onChange={(e) => upsert(today, { intention: e.target.value })}
            placeholder="e.g. Make time for a walk."
            rows={2}
            aria-label="Today's intention"
          />
          <div className="intention-note">A reminder to yourself, separate from your tasks. Saves as you type.</div>
        </Card>}
      </section>

      {order.some((id) => !todayHidden.includes(id)) && <div className="today-working-head"><div><h2>Check in & keep going</h2></div><p>Your habits, reading, and plans in one place.</p></div>}
      <div className="grid dash today-dashboard">
        {order.filter((id) => !todayHidden.includes(id)).map((id) => {
          if (id === 'checkin') return <Card key={id} className="today-wins" tint="var(--surface)">
          <div className="stack" style={{ gap: 10 }}>
            <div className="today-card-kicker"><h2 className="card-title">{evening ? <Moon /> : <Sun />}A moment for you</h2><em>Optional</em></div>
            <span className="today-field-label" id="today-mood-label">How are you feeling?</span>
            <div className="mood today-mood" role="group" aria-labelledby="today-mood-label">
              {MOODS.map((m) => (
                <button key={m.v} aria-pressed={entry?.mood === m.v} aria-label={m.label} className={entry?.mood === m.v ? 'active' : ''} onClick={() => upsert(today, { mood: entry?.mood === m.v ? undefined : m.v })}><span aria-hidden="true">{m.emoji}</span><small>{m.label}</small></button>
              ))}
            </div>
            <label className="today-field-label" htmlFor="today-win">One small win</label>
            {!entry?.wins?.length && <p className="today-helper">Finished something? Made time for yourself? It counts.</p>}
            <div className="list">
              {(entry?.wins ?? []).map((w, i) => (
                <div key={i} className="list-item" style={{ padding: '5px 4px' }}>
                  <span style={{ color: 'var(--accent)' }}>✦</span><span className="grow" style={{ fontSize: 13.5 }}>{w}</span>
                  <button className="btn ghost icon sm" aria-label="Remove win" onClick={() => removeWin(i)}><X size={13} /></button>
                </div>
              ))}
            </div>
            <form className="quick-add today-entry" onSubmit={(e) => { e.preventDefault(); addWin(win); setWin(''); }}>
              <input id="today-win" placeholder="e.g. Read a chapter" value={win} onChange={(e) => setWin(e.target.value)} aria-label="Add a win" />
              <Button type="submit" size="sm" icon={Plus} disabled={!win.trim()}>Add win</Button>
            </form>
            {evening && (
              <label className="stack today-field-label">Evening reflection<textarea value={entry?.reflection ?? ''} onChange={(e) => upsert(today, { reflection: e.target.value })} placeholder="What went well? What would you change tomorrow?" rows={3} style={{ fontSize: 13.5 }} aria-label="Evening reflection" /><small className="today-helper">Saves as you type.</small></label>
            )}
          </div>
        </Card>;
          const widget = widgets.find((w) => w.id === id);
          return widget ? <div key={id} className={widget.size === 'span-2' ? 'span-2' : ''}><widget.Component /></div> : null;
        })}
      </div>
      <Modal open={customizing} onClose={() => setCustomizing(false)} title="Customize Today">
        <p className="muted">Choose what you see. These preferences apply to this browser; your records stay in their areas.</p>
        <div className="stack today-customize">
          {['tasks', 'intention', ...order].map((id) => <div className="between" key={id}>
            <label className="row"><input type="checkbox" checked={!todayHidden.includes(id)} onChange={() => setTodayLayout(order, todayHidden.includes(id) ? todayHidden.filter((item) => item !== id) : [...todayHidden, id])} />{TODAY_LABELS[id]}</label>
            {order.includes(id) && <div className="row"><Button size="sm" aria-label={`Move ${TODAY_LABELS[id]} up`} disabled={order.indexOf(id) === 0} onClick={() => move(id, -1)}>↑</Button><Button size="sm" aria-label={`Move ${TODAY_LABELS[id]} down`} disabled={order.indexOf(id) === order.length - 1} onClick={() => move(id, 1)}>↓</Button></div>}
          </div>)}
          <p className="muted">Tasks and daily focus stay at the top when shown. Use the arrows to arrange the sections below.</p>
          <div className="form-actions"><Button onClick={() => setTodayLayout(TODAY_SECTIONS, [])}>Reset layout</Button><Button variant="primary" onClick={() => setCustomizing(false)}>Close</Button></div>
        </div>
      </Modal>
    </div>
  );
}

function GettingStarted() {
  const cloudLoadedAt = useSyncStatus((state) => state.lastSyncedAt);
  const { gettingStarted, setGettingStarted, lastBackupAt } = useUI();
  const tasks = useTasks((state) => state.tasks);
  const habits = useHealth((state) => state.habits);
  const books = useLibrary((state) => state.books);
  const runs = useImports((state) => state.runs);
  useEffect(() => {
    if (config.mode === 'cloud' && !cloudLoadedAt) return;
    let active = true;
    void Promise.all([whenHydrated(useUI), ...[...registeredStores().values()].map(whenHydrated)]).then(() => {
      if (!active || useUI.getState().gettingStarted !== null) return;
      const hasData = [...registeredStores().values()].some((store) => Object.entries(store.getState()).some(([key, value]) => !['goal', 'atmosphere'].includes(key) && value && typeof value === 'object' && Object.keys(value).length > 0));
      setGettingStarted(!hasData);
    });
    return () => { active = false; };
  }, [setGettingStarted, cloudLoadedAt]);
  if (!gettingStarted) return null;
  const steps = [
    { label: 'Add your first task', to: '/tasks', done: Object.keys(tasks).length > 0 },
    { label: 'Create a habit', to: '/health', done: Object.keys(habits).length > 0 },
    { label: 'Add a book or import your library (optional)', to: '/library', done: Object.keys(books).length > 0 || runs.length > 0 },
    { label: 'Download your first backup', to: '/settings', done: Boolean(lastBackupAt) },
  ];
  return <Card className="getting-started" title="Make this space yours" action={<Button size="sm" variant="ghost" onClick={() => setGettingStarted(false)}>Dismiss checklist</Button>}>
    <p className="muted">Start anywhere. You can reopen this checklist in Settings.</p>
    <ul>{steps.map((step) => <li key={step.to}><span aria-label={step.done ? 'Complete' : 'To do'}>{step.done ? '✓' : '○'}</span><Link to={step.to}>{step.label}</Link></li>)}</ul>
  </Card>;
}
