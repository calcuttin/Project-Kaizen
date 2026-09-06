import { useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Bar, Button, Card, Empty } from '@/components/ui';
import { toast } from '@/components/Toast';
import { coverGradient, finishedThisYear, useLibrary } from './store';

export function ReadingWidget() {
  const { books, goal, logProgress } = useLibrary();
  const reading = Object.values(books).filter((b) => b.status === 'reading').slice(0, 3);
  const finished = finishedThisYear(Object.values(books), new Date().getFullYear()).length;
  const [pageFor, setPageFor] = useState<Record<string, string>>({});
  return (
    <Card title="Reading" icon={BookOpen} accent="var(--library)" action={<Link to="/library" className="faint" style={{ fontSize: 12 }}>{finished}/{goal.books} this year <ArrowRight size={11} style={{ verticalAlign: '-1px' }} /></Link>}>
      {!reading.length ? <Empty icon={BookOpen} title="Nothing in progress" hint="Start a book from your shelves." /> : (
        <div className="stack" style={{ gap: 12 }}>
          {reading.map((b) => (
            <div key={b.id} className="row" style={{ gap: 12 }}>
              <div className="cover" style={{ '--cover': coverGradient(b.hue), width: 34, borderRadius: 3, padding: 0, boxShadow: 'var(--shadow-sm)' } as React.CSSProperties} />
              <div className="grow stack" style={{ gap: 4 }}>
                <div className="between"><span className="truncate" style={{ fontWeight: 500 }}>{b.title}</span><span className="faint mono" style={{ fontSize: 12 }}>p. {b.currentPage}/{b.pages}</span></div>
                <Bar value={b.currentPage} max={b.pages} color="var(--library)" thin />
              </div>
              <input type="number" placeholder="page" value={pageFor[b.id] ?? ''} onChange={(e) => setPageFor({ ...pageFor, [b.id]: e.target.value })} style={{ width: 70, padding: '5px 8px' }} aria-label={`Current page in ${b.title}`}
                onKeyDown={(e) => { if (e.key === 'Enter' && pageFor[b.id]) { logProgress(b.id, Number(pageFor[b.id])); toast('Progress logged'); setPageFor({ ...pageFor, [b.id]: '' }); } }} />
              <Button size="sm" onClick={() => { const v = pageFor[b.id]; if (v) { logProgress(b.id, Number(v)); toast('Progress logged'); setPageFor({ ...pageFor, [b.id]: '' }); } else { logProgress(b.id, b.currentPage + 10); toast('+10 pages'); } }}>{pageFor[b.id] ? 'Log' : '+10'}</Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
