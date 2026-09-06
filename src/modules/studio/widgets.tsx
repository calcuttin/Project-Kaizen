import { ArrowRight, Mic } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Chip, Empty } from '@/components/ui';
import { humanDate } from '@/core/dates';
import { useUI } from '@/app/uiStore';
import { cadence, channelSnapshots, metricTrend, useStudio } from './store';
import { useEffect } from 'react';
import { whenHydrated } from '@/core/store';

export function StudioWidget() {
  const lens = useUI((s) => s.lens);
  const { channels, pieces, snapshots, ensureDefaults } = useStudio();
  useEffect(() => { void whenHydrated(useStudio).then(() => ensureDefaults()); }, [ensureDefaults]);
  if (lens === 'personal') return null;
  const list = Object.values(channels).filter((c) => !c.archived);
  const all = Object.values(pieces);
  return (
    <Card title="Studio" icon={Mic} action={<Link to="/studio" className="faint" style={{ fontSize: 12 }}>Studio <ArrowRight size={11} style={{ verticalAlign: '-1px' }} /></Link>}>
      {!list.length ? <Empty icon={Mic} title="No channels yet" hint="Set up your podcast and Substack in Studio." /> : (
        <div className="stack" style={{ gap: 10 }}>
          {list.map((c) => {
            const cad = cadence(c, all);
            const next = all.filter((p) => p.channelId === c.id && p.stage === 'scheduled' && p.publishDate).sort((a, b) => a.publishDate!.localeCompare(b.publishDate!))[0];
            const working = all.filter((p) => p.channelId === c.id && ['outline', 'production', 'edit'].includes(p.stage)).length;
            const primary = metricTrend(channelSnapshots(snapshots, c.id), c.metricKeys[0]);
            const late = cad.daysLeft < 0;
            return (
              <div key={c.id} className="row" style={{ gap: 10 }}>
                <span style={{ width: 8, height: 32, borderRadius: 4, background: c.color, flex: 'none' }} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="between"><span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: late ? 'var(--danger)' : cad.daysLeft <= 2 ? 'var(--warning)' : 'var(--text-2)' }}>{late ? `${-cad.daysLeft}d overdue` : cad.daysLeft === 0 ? 'Due today' : `Due in ${cad.daysLeft}d`}</span></div>
                  <div className="row" style={{ gap: 6, fontSize: 12, color: 'var(--text-3)', flexWrap: 'wrap' }}>
                    {next ? <Chip tone="accent">{humanDate(next.publishDate)} · {next.title}</Chip> : <span>{working ? `${working} in the works` : 'nothing scheduled'}</span>}
                    {primary.latest !== undefined && <span>· {primary.latest} {c.metricKeys[0].toLowerCase()}{primary.delta ? ` (${primary.delta > 0 ? '+' : ''}${primary.delta})` : ''}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
