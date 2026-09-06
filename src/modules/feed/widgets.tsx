import { useState } from 'react';
import { ArrowRight, ListMusic } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Empty } from '@/components/ui';
import { useUI } from '@/app/uiStore';
import { inLens } from '@/core/types';
import { FinishModal, ItemRow } from './FeedPage';
import { useFeed } from './store';

export function UpNextWidget() {
  const lens = useUI((s) => s.lens);
  const { items, sources } = useFeed();
  const [finishing, setFinishing] = useState<string | null>(null);
  const queue = Object.values(items)
    .filter((i) => (i.status === 'queued' || i.status === 'in-progress') && inLens(sources[i.sourceId]?.domain, lens) || (sources[i.sourceId] && !sources[i.sourceId].domain && (i.status === 'queued' || i.status === 'in-progress')))
    .sort((a, b) => Number(b.pinned ?? 0) - Number(a.pinned ?? 0) || (a.status === 'in-progress' ? -1 : 1) - (b.status === 'in-progress' ? -1 : 1) || a.createdAt.localeCompare(b.createdAt))
    .slice(0, 4);
  return (
    <Card title="Up next" icon={ListMusic} accent="var(--feed)" action={<Link to="/feed" className="faint" style={{ fontSize: 12 }}>Feed <ArrowRight size={11} style={{ verticalAlign: '-1px' }} /></Link>}>
      {!queue.length ? <Empty icon={ListMusic} title="Queue is clear" hint="Nothing waiting. Enjoy the quiet." /> : (
        <div className="list">{queue.map((i) => <ItemRow key={i.id} item={i} source={sources[i.sourceId]} compact onFinish={() => setFinishing(i.id)} />)}</div>
      )}
      <FinishModal id={finishing} onClose={() => setFinishing(null)} />
    </Card>
  );
}
