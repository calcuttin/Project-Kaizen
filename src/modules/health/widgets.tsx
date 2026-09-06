import { ArrowRight, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Empty, Ring } from '@/components/ui';
import { todayKey } from '@/core/dates';
import { habitDone, habitStreak, useHealth } from './store';

export function HabitsWidget() {
  const { habits, logs, toggleLog, incrementLog } = useHealth();
  const list = Object.values(habits).filter((h) => !h.archived).sort((a, b) => a.order - b.order);
  const today = todayKey();
  const done = list.filter((h) => habitDone(h, logs[h.id]?.[today])).length;
  return (
    <Card title="Habits" icon={Flame} accent="var(--health)" action={<Link to="/health" className="faint" style={{ fontSize: 12 }}>Health <ArrowRight size={11} style={{ verticalAlign: '-1px' }} /></Link>}>
      {!list.length ? <Empty icon={Flame} title="No habits yet" hint="Add one on the Health page." /> : (
        <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
          <Ring value={done} max={list.length} color="var(--health)" label={`${done}/${list.length}`} size={80} stroke={7} />
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            {list.map((h) => {
              const v = logs[h.id]?.[today] ?? 0; const on = habitDone(h, v); const streak = habitStreak(h, logs[h.id]);
              return (
                <button key={h.id} className={`chip clickable ${on ? 'success' : ''}`} style={{ padding: '6px 10px', fontSize: 13 }}
                  onClick={() => (h.kind === 'count' ? incrementLog(h.id, 1) : toggleLog(h.id))}
                  title={h.kind === 'count' ? `${v}/${h.target} ${h.unit ?? ''} · click to add 1` : on ? 'Done — click to undo' : 'Mark done'}>
                  <span>{h.emoji}</span>{h.name}{h.kind === 'count' && <span className="mono" style={{ opacity: .7 }}>{v}/{h.target}</span>}
                  {streak > 1 && <span style={{ opacity: .7 }}>🔥{streak}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
