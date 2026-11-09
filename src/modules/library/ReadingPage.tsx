import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus } from 'lucide-react';
import { Bar, Button, Card, Empty, Field, Modal, PageHead } from '@/components/ui';
import { toast } from '@/components/Toast';
import { BookCover } from './BookCover';
import { BOOK_STATUS, finishedThisYear, pagesInLastDays, useLibrary } from './store';
import './reading.css';

export function ReadingPage() {
  const { books, logProgress } = useLibrary();
  const nav = useNavigate();
  const [logging, setLogging] = useState<string | null>(null);
  const [page, setPage] = useState('');
  const [error, setError] = useState('');
  const current = Object.values(books).filter(b => b.status === 'reading' || b.status === 'paused');
  const book = logging ? books[logging] : undefined;
  return <div className="page reading-page"><PageHead eyebrow="One page at a time" title="Currently reading" lead="Come back to the worlds you’ve left open." action={<Button onClick={() => nav('/library')}>Browse your shelves</Button>} />
    {!current.length ? <Empty icon={BookOpen} title="Your next chapter is waiting" hint="Choose a book on your shelves and set its status to Reading." action={<Button onClick={() => nav('/library')}>Browse books</Button>} /> : <div className="reading-cards">{current.map(b => <article className="reading-card" key={b.id}><BookCover book={b}><span className="ctitle">{b.title}</span><span className="cauthor">{b.author}</span></BookCover><div className="reading-card-copy"><span className="chip">{BOOK_STATUS[b.status]}</span><h2><button onClick={() => nav(`/library?record=${encodeURIComponent(b.id)}`)}>{b.title}</button></h2><p className="muted">{b.author}</p><p className="between muted"><span>Page {b.currentPage} of {b.pages}</span><span>{b.pages > 0 ? Math.round(b.currentPage / b.pages * 100) : 0}%</span></p><Bar value={b.currentPage} max={b.pages} color="var(--library)" /><div className="row reading-card-actions"><Button variant="primary" icon={Plus} onClick={() => { setLogging(b.id); setPage(String(b.currentPage)); setError(''); }}>Log reading</Button><Button onClick={() => nav(`/library?record=${encodeURIComponent(b.id)}`)}>Notes & details</Button></div></div></article>)}</div>}
    <Modal open={Boolean(book)} onClose={() => setLogging(null)} title="A little further along">{book && <form className="form" onSubmit={e => { e.preventDefault(); const currentBook = useLibrary.getState().books[book.id]; const target = Number(page); if (!currentBook || !Number.isInteger(target) || target < currentBook.currentPage || target > currentBook.pages) { setError('Enter a whole page number between your current page and the end of the book.'); return; } logProgress(book.id, target); setLogging(null); toast('Reading progress saved'); }}><p>{book.title} · Page {book.currentPage} of {book.pages}</p><Field label="What page did you reach?"><input aria-label="What page did you reach?" type="number" min={book.currentPage} max={book.pages} step={1} required value={page} onChange={e => setPage(e.target.value)} /></Field><p className="muted">Only newly read pages are added to your journal.</p>{error && <p role="alert">{error}</p>}<div className="form-actions"><Button onClick={() => setLogging(null)}>Cancel</Button><button className="btn primary" type="submit">Save reading</button></div></form>}</Modal>
  </div>;
}

export function ReadingJournalPage() {
  const { books, sessions, goal } = useLibrary();
  const nav = useNavigate();
  const year = new Date().getFullYear();
  const finished = finishedThisYear(Object.values(books), year);
  const ordered = [...sessions].sort((a,b) => b.date.localeCompare(a.date));
  return <div className="page reading-page"><PageHead eyebrow="Small steps, stories finished" title="Your reading year" lead="Every page is a little progress." action={<Button onClick={() => nav('/library')}>Manage goal on Bookshelf</Button>} /><div className="grid cols-3 reading-stats"><Card title={`Books finished · ${year}`}><strong>{finished.length}</strong>{goal.enabled !== false && <span className="muted"> / {goal.books}</span>}</Card><Card title="Pages this week"><strong>{pagesInLastDays(sessions, 7)}</strong></Card><Card title="Pages logged · all time"><strong>{sessions.reduce((sum,s) => sum+s.pages,0)}</strong></Card></div><Card title="Reading journal">{!ordered.length ? <Empty icon={BookOpen} title="One page at a time" hint="Log reading progress to see your sessions here." action={<Button onClick={() => nav('/reading')}>Go to Reading</Button>} /> : <div className="reading-sessions">{ordered.map(s => { const b = books[s.bookId]; return <button key={s.id} className="reading-session" disabled={!b} onClick={() => nav(`/library?record=${encodeURIComponent(s.bookId)}`)}><BookOpen size={18} /><span><strong>{b?.title ?? 'Removed book'}</strong><small>{new Date(s.date+'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</small></span><b>+{s.pages} pages</b></button>; })}</div>}</Card></div>;
}
