import { useState, type CSSProperties } from 'react';
import { CircleDot, Moon, Plus, Sparkles, Sun, X } from 'lucide-react';
import { Card } from '@/components/ui';
import { format, greeting, todayKey } from '@/core/dates';
import { modules } from '@/app/registry';
import { MOODS, useJournal } from '@/modules/journal/store';
import './today.css';

export function TodayPage() {
  const today = todayKey();
  const { entries, upsert, addWin, removeWin } = useJournal();
  const entry = entries[today];
  const [win, setWin] = useState('');
  const widgets = modules.flatMap((m) => m.widgets ?? []).sort((a, b) => a.order - b.order);
  const evening = new Date().getHours() >= 17;
  const ritualTotal = evening ? 4 : 3;
  const ritualComplete = [Boolean(entry?.intention?.trim()), Boolean(entry?.mood), Boolean(entry?.wins?.length), evening && Boolean(entry?.reflection?.trim())].filter(Boolean).length;
  const ritualPct = Math.round((ritualComplete / ritualTotal) * 100);

  return (
    <div className="page today-page">
      <header className="today-masthead">
        <div>
          <div className="eyebrow">Daily field notes · {format(new Date(), 'EEEE, MMMM d')}</div>
          <h1>{greeting()}<span>.</span></h1>
          <p>Make the day a little clearer than you found it.</p>
        </div>
        <div className="today-rhythm" aria-label={`${ritualComplete} of ${ritualTotal} daily check-ins complete`}>
          <div className="rhythm-orbit" style={{ '--ritual': `${ritualPct}%` } as CSSProperties}><b>{ritualComplete}</b><small>of {ritualTotal}</small></div>
          <div><span className="rhythm-label"><CircleDot /> Daily rhythm</span><strong>{ritualComplete === ritualTotal ? 'Day captured' : `${ritualTotal - ritualComplete} small signal${ritualTotal - ritualComplete === 1 ? '' : 's'} to go`}</strong></div>
        </div>
      </header>

      <section className="today-ritual">
        <Card className="intention today-intention" tint="var(--accent-soft)">
          <div className="today-card-kicker"><span>01</span><div className="card-title"><Sparkles /> One small improvement</div><em>Focus</em></div>
          <textarea
            value={entry?.intention ?? ''}
            onChange={(e) => upsert(today, { intention: e.target.value })}
            placeholder="What's the one thing that, done today, makes today better than yesterday?"
            rows={2}
            aria-label="Today's intention"
          />
          <div className="intention-note"><span>改善</span> kaizen — small, continuous, compounding.</div>
        </Card>

        <Card className="today-wins" tint="var(--surface)">
          <div className="stack" style={{ gap: 10 }}>
            <div className="today-card-kicker"><span>02</span><div className="card-title">{evening ? <Moon /> : <Sun />}{evening ? 'Evening reflection' : 'Wins so far'}</div><em>{entry?.wins?.length ?? 0} logged</em></div>
            <div className="mood" role="radiogroup" aria-label="Mood">
              {MOODS.map((m) => (
                <button key={m.v} role="radio" aria-checked={entry?.mood === m.v} className={entry?.mood === m.v ? 'active' : ''} title={m.label} onClick={() => upsert(today, { mood: entry?.mood === m.v ? undefined : m.v })}>{m.emoji}</button>
              ))}
            </div>
            <div className="list">
              {(entry?.wins ?? []).map((w, i) => (
                <div key={i} className="list-item" style={{ padding: '5px 4px' }}>
                  <span style={{ color: 'var(--accent)' }}>✦</span><span className="grow" style={{ fontSize: 13.5 }}>{w}</span>
                  <button className="btn ghost icon sm" aria-label="Remove win" onClick={() => removeWin(i)}><X size={13} /></button>
                </div>
              ))}
            </div>
            <div className="quick-add" style={{ padding: '6px 10px' }}>
              <Plus />
              <input placeholder="Log a win, however small" value={win} onChange={(e) => setWin(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { addWin(win); setWin(''); } }} aria-label="Add a win" />
            </div>
            {evening && (
              <textarea value={entry?.reflection ?? ''} onChange={(e) => upsert(today, { reflection: e.target.value })} placeholder="What did today teach you? What's one thing to do differently tomorrow?" rows={3} style={{ fontSize: 13.5 }} aria-label="Evening reflection" />
            )}
          </div>
        </Card>
      </section>

      <div className="today-working-head"><div><span>03</span><h2>Your working set</h2></div><p>Signals from the parts of life already in motion.</p></div>
      <div className="grid dash today-dashboard">
        {widgets.map((w) => (
          <div key={w.id} className={w.size === 'span-2' ? 'span-2' : ''}><w.Component /></div>
        ))}
      </div>
    </div>
  );
}
