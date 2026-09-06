import { useUI } from '@/app/uiStore';
import { deleteWithUndo } from '@/core/undo';
import { currentWorkspaceOwner, workspaceAvailable } from '@/core/storage';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { BookOpen, Camera, CheckCheck, LayoutGrid, Library, Plus, Rows3, Star, Sun, Trash2, Upload } from 'lucide-react';
import { Bar, Button, Chip, Empty, Field, Modal, PageHead, Ring, Segmented } from '@/components/ui';
import { Popover, type Anchor } from '@/components/ui/Popover';
import { toast } from '@/components/Toast';
import { BOOK_STATUS, finishedThisYear, pagesInLastDays, useLibrary, type Book, type BookStatus, type Shelf } from './store';
import { SHELF_THEMES, spineStyle, spineVariant, themeForShelfName, type ShelfTheme } from './themes';
import { ShelfScene, useReducedMotion } from './ShelfScene';
import { RetroTerminal } from './RetroTerminal';
import { BookCover, lookupOpenLibraryBook, retryBookCovers } from './BookCover';
import { ImportCenter } from './ImportCenter';
import './library.css';

type Tab = 'all' | BookStatus | `shelf:${string}`;
type View = 'shelves' | 'grid';

export function LibraryPage() {
  const { books, shelves, sessions, goal, addShelf, deleteShelf, setStatus, atmosphere, setAtmosphere } = useLibrary();
  const [view, setView] = useState<View>('shelves');
  const { externalBookCovers, setExternalBookCovers } = useUI();
  const [query, setQuery] = useState('');
  const [shelfFilter, setShelfFilter] = useState('all');
  const [tab, setTab] = useState<Tab>('all');
  const [adding, setAdding] = useState(false);
  const [addingShelf, setAddingShelf] = useState(false);
  const [shelfName, setShelfName] = useState('');
  const [importing, setImporting] = useState(false);
  const [open, setOpen] = useState<{ id: string; anchor: Anchor } | null>(null);
  const [goalEdit, setGoalEdit] = useState(false);
  const [markMode, setMarkMode] = useState(false);
  const [computer, setComputer] = useState(false);
  const reducedMotion = useReducedMotion();
  const all = useMemo(() => Object.values(books), [books]);
  const shelfList = useMemo(() => Object.values(shelves).sort((a, b) => a.order - b.order), [shelves]);
  const year = new Date().getFullYear();
  const finished = finishedThisYear(all, year);
  const reading = all.filter((b) => b.status === 'reading');
  const pages7 = pagesInLastDays(sessions, 7);
  const matches = useCallback((b: Book, t: Tab) => t === 'all' ? true : t.startsWith('shelf:') ? b.shelfId === t.slice(6) : b.status === t, []);
  const visible = useMemo(() => all.filter((b) => matches(b, tab) && matches(b, shelfFilter as Tab) && `${b.title} ${b.author} ${b.isbn ?? ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => (a.status === 'reading' ? -1 : 0) - (b.status === 'reading' ? -1 : 0) || b.updatedAt.localeCompare(a.updatedAt)), [all, tab, shelfFilter, query, matches]);
  const count = (t: Tab) => all.filter((b) => matches(b, t)).length;
  const onBookClick = (b: Book) => (e: MouseEvent) => {
    if (markMode) {
      const next: BookStatus = b.status === 'finished' ? 'want' : 'finished';
      setStatus(b.id, next); toast(next === 'finished' ? `Finished “${b.title}”` : `“${b.title}” back to Want to read`); return;
    }
    const rect = e.currentTarget?.getBoundingClientRect();
    setOpen({ id: b.id, anchor: e.detail === 0 && rect ? { x: rect.right, y: rect.top + 40 } : { x: e.clientX, y: e.clientY } });
  };
  const closeDetail = useCallback(() => setOpen(null), []);
  return <div className="page library-page">
    <PageHead eyebrow="A WORLD BETWEEN THE PAGES" title="Bookshelf" action={<>
      <Segmented value={view} onChange={setView} options={[{ value: 'shelves', label: 'Shelves', icon: Rows3 }, { value: 'grid', label: 'Grid', icon: LayoutGrid }]} />
      <Button icon={CheckCheck} onClick={() => setMarkMode((m) => !m)} className={markMode ? 'primary' : ''} title="Tap books to toggle Finished / Want to read">{markMode ? 'Done marking' : 'Mark read'}</Button>
      <Button icon={Upload} onClick={() => setImporting(true)}>Import</Button>
      <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>Add book</Button>
      <button className="atmosphere-toggle" aria-pressed={atmosphere && !reducedMotion} disabled={reducedMotion} onClick={() => setAtmosphere(!atmosphere)} title={reducedMotion ? 'Your system preference reduces motion' : 'Pause or play all ambient motion'}><Sun size={16} /><span>{reducedMotion ? 'Motion reduced' : 'Atmosphere'}</span><b>{atmosphere && !reducedMotion ? 'On' : 'Off'}</b></button>
    </>} />
    <div className="library-toolbar"><div className="library-summary">
      <button className="library-goal" onClick={() => setGoalEdit(true)} aria-label={`Edit ${year} reading goal`}>
        <Ring value={finished.length} max={goal.books} color="var(--library)" label={finished.length} sub={`of ${goal.books}`} size={55} />
        <span><small>{year} reading goal</small><strong>{finished.length} read <i>/</i> {Math.max(0, goal.books - finished.length)} to go</strong></span>
      </button>
      <div className="library-rhythm"><BookOpen size={15} /><span><strong>{pages7} pages</strong><small>this week · {goal.pagesPerDay} a day to aim for</small></span></div>
      <div className="library-current"><small>ON YOUR NIGHTSTAND</small>{reading.length ? <button onClick={onBookClick(reading[0])}>{reading[0].title}</button> : <span>Your next chapter is waiting.</span>}</div>

    </div>
    <div className="library-filterbar">
      <div className="library-status" role="group" aria-label="Filter books by status">
        <button aria-pressed={tab === 'all'} className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>All <span>{all.length}</span></button>
        {(['reading', 'want', 'finished', 'paused'] as BookStatus[]).map((s) => <button key={s} aria-pressed={tab === s} className={tab === s ? 'active' : ''} onClick={() => setTab(s)}>{BOOK_STATUS[s]} <span>{count(s)}</span></button>)}
      </div>
      <div className="library-shelf-filter"><select aria-label="Choose shelf" value={shelfFilter} onChange={(e) => setShelfFilter(e.target.value)}><option value="all">All shelves · {shelfList.length}</option>{shelfList.map((s) => <option key={s.id} value={`shelf:${s.id}`}>{s.name} · {count(`shelf:${s.id}`)}</option>)}</select><button className="btn sm ghost" onClick={() => { setShelfName(''); setAddingShelf(true); }}><Plus size={13} />Shelf</button></div>
    </div>
    </div>
    <div className="library-search row"><input type="search" aria-label="Search books" placeholder="Search by title, author, or ISBN" value={query} onChange={(e) => setQuery(e.target.value)} />{(query || tab !== 'all' || shelfFilter !== 'all') && <Button onClick={() => { setQuery(''); setTab('all'); setShelfFilter('all'); }}>Clear filters</Button>}<span className="muted" role="status">{visible.length} of {all.length} books</span></div>
    <div className="library-cover-help">
      {externalBookCovers ? <><span>Online covers are on. Missing artwork may be unavailable from Open Library.</span><Button size="sm" onClick={() => { retryBookCovers(); toast('Retrying visible covers. Scroll to load more.'); }}>Retry covers</Button></> : <><span>Online covers are off. Enabling them sends book details and your IP address to Open Library.</span><Button size="sm" onClick={() => setExternalBookCovers(true)}>Enable online covers</Button></>}
    </div>
    {markMode && <div className="library-mark-note">Mark-read mode: select a book to toggle Finished / Want to read.</div>}
    {!visible.length && (query || tab !== 'all' || shelfFilter !== 'all') ? <Empty icon={BookOpen} title="No matching books" hint="Try a different search or clear your filters." /> : view === 'shelves' ? <Bookcase shelves={shelfList.filter((s) => shelfFilter === 'all' || shelfFilter === `shelf:${s.id}`)} books={visible} tab={tab} markMode={markMode} onBookClick={onBookClick} atmosphere={atmosphere && !reducedMotion} onComputer={() => setComputer(true)} onDeleteShelf={(s) => { if (confirm(`Remove shelf “${s.name}”? Books stay in your library.`)) { deleteShelf(s.id); setShelfFilter('all'); } }} /> : !visible.length ? <Empty icon={BookOpen} title="No books here" hint="Try another shelf or add a book." action={<Button size="sm" onClick={() => setAdding(true)}>Add a book</Button>} /> : <div className="book-grid">{visible.map((b) => <BookCard key={b.id} book={b} onClick={onBookClick(b)} />)}</div>}
    <p className="library-footnote">{all.length} books · {shelfList.length} shelves · Countless places to go.</p>
    {adding && <AddBookModal open onClose={() => setAdding(false)} defaultShelf={shelfFilter.startsWith('shelf:') ? shelfFilter.slice(6) : undefined} />}
    <Modal open={addingShelf} onClose={() => setAddingShelf(false)} title="Create a shelf"><form className="form" onSubmit={(e) => { e.preventDefault(); const name = shelfName.trim(); if (!name) return; addShelf(name, themeForShelfName(name)); setAddingShelf(false); setShelfFilter('all'); setTab('all'); setQuery(''); setView('shelves'); }}><Field label="Shelf name"><input autoFocus value={shelfName} maxLength={120} onChange={(e) => setShelfName(e.target.value)} placeholder="Office, Fantasy, or a world of your own" /></Field><p className="muted">Each shelf comes with a display cabinet you can customize.</p><div className="form-actions"><button type="button" className="btn ghost" onClick={() => setAddingShelf(false)}>Cancel</button><button type="submit" className="btn primary" disabled={!shelfName.trim()}>Create shelf</button></div></form></Modal>
    <ImportCenter open={importing} onClose={() => setImporting(false)} />
    <Popover anchor={open?.anchor ?? null} onClose={closeDetail} label="Book details">{open && <BookDetail key={open.id} id={open.id} onClose={closeDetail} />}</Popover>
    <Modal open={goalEdit} onClose={() => setGoalEdit(false)} title={`${year} reading goal`}><GoalForm onDone={() => setGoalEdit(false)} /></Modal>
    <RetroTerminal open={computer} onClose={() => setComputer(false)} />
  </div>;
}

function Bookcase({ shelves, books, tab, markMode, atmosphere, onComputer, onBookClick, onDeleteShelf }: { shelves: Shelf[]; books: Book[]; tab: Tab; markMode: boolean; atmosphere: boolean; onComputer: () => void; onBookClick: (b: Book) => (e: MouseEvent) => void; onDeleteShelf: (s: Shelf) => void }) {
  const statusFilter = tab !== 'all' && !tab.startsWith('shelf:') ? tab as BookStatus : null;
  const shelfFilter = tab.startsWith('shelf:') ? tab.slice(6) : null;
  const unshelved = books.filter((b) => !b.shelfId || !shelves.some((s) => s.id === b.shelfId));
  const rows: { shelf: Shelf | null; items: Book[] }[] = [
    ...shelves.filter((s) => !shelfFilter || s.id === shelfFilter).map((s) => ({ shelf: s, items: books.filter((b) => b.shelfId === s.id && (!statusFilter || b.status === statusFilter)) })),
    ...(!shelfFilter && unshelved.length ? [{ shelf: null, items: unshelved.filter((b) => !statusFilter || b.status === statusFilter) }] : []),
  ].filter((row) => !statusFilter || row.items.length);
  if (!rows.length) return <Empty icon={Library} title={statusFilter ? 'No books with this status yet' : 'No shelves yet'} hint={statusFilter ? 'Choose All to explore your collection.' : 'Add a shelf, then add books to it.'} />;
  return <div className="world-bookcase">{rows.map(({ shelf, items }) => {
    const themeKey: ShelfTheme = shelf ? shelf.theme ?? themeForShelfName(shelf.name) : 'default';
    const theme = SHELF_THEMES[themeKey];
    const ordered = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return <ShelfScene key={shelf?.id ?? 'unshelved'} shelf={shelf} themeKey={themeKey} count={items.length} finished={items.filter((b) => b.status === 'finished').length} atmosphere={atmosphere} onComputer={onComputer} onDeleteShelf={onDeleteShelf}>
      {ordered.length ? ordered.map((b, i) => {
        const style = spineStyle(b, theme, i);
        const height = 180 + ((b.hue * 7 + b.pages) % 36);
        return <button key={b.id} className={`spine v${spineVariant(b)} ${b.status === 'reading' ? 'reading' : ''} ${(style.width as number) < 28 ? 'narrow' : ''} ${markMode ? 'mark-hover' : ''}`} style={{ ...style, height }} onClick={onBookClick(b)} title={`${b.title} — ${b.author}`} aria-label={b.title}>
          <BookCover book={b} className="spine-cover" />
          <span className="sband top" /><span className="sband bottom" /><span className="stitle">{b.title}</span><span className="sauthor">{b.author.split(/,|&/)[0].trim()}</span>
          {b.status === 'finished' && <span className="sfinished">✓</span>}{b.status === 'reading' && <><span className="sribbon" /><span className="sprogress"><i style={{ width: `${b.pages ? b.currentPage / b.pages * 100 : 0}%` }} /></span></>}
        </button>;
      }) : <span className="shelf-empty">Room for your next discovery.</span>}
    </ShelfScene>;
  })}</div>;
}

function BookCard({ book, onClick }: { book: Book; onClick: (e: MouseEvent) => void }) {
  const pct = book.pages ? (book.currentPage / book.pages) * 100 : 0;
  return (
    <div className="book" onClick={onClick} role="button" aria-label={`${book.title} by ${book.author}`} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const r = (e.target as HTMLElement).getBoundingClientRect(); onClick({ clientX: r.right, clientY: r.top + 40 } as MouseEvent); } }}>
      <BookCover book={book}>
        <div className="ctitle">{book.title}</div>
        <div className="cauthor">{book.author}</div>
        {book.status === 'reading' && <div className="cprog"><i style={{ width: `${pct}%` }} /></div>}
      </BookCover>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Chip tone={book.status === 'reading' ? 'accent' : book.status === 'finished' ? 'success' : undefined}>{BOOK_STATUS[book.status]}</Chip>
        {book.rating && <span className="row" style={{ gap: 2, color: 'var(--accent)' }}>{Array.from({ length: book.rating }).map((_, i) => <Star key={i} size={11} fill="currentColor" />)}</span>}
      </div>
    </div>
  );
}

function AddBookModal({ open, onClose, defaultShelf }: { open: boolean; onClose: () => void; defaultShelf?: string }) {
  const { addBook, shelves } = useLibrary();
  const [title, setTitle] = useState(''); const [author, setAuthor] = useState(''); const [isbn, setIsbn] = useState(''); const [pages, setPages] = useState('300');
  const [status, setStatus] = useState<BookStatus>('want'); const [shelfId, setShelfId] = useState(defaultShelf ?? '');
  const [lookingUp, setLookingUp] = useState(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const [scanning, setScanning] = useState(false);
  const reset = () => { setTitle(''); setAuthor(''); setIsbn(''); setPages('300'); };
  const shelve = (bookTitle: string, bookAuthor: string, bookPages: number) => {
    addBook({ title: bookTitle, author: bookAuthor, isbn, pages: bookPages, status, shelfId: shelfId || undefined });
    toast(`“${bookTitle}” shelved`);
    reset(); onClose();
  };
  const submit = async () => {
    if (title.trim()) { shelve(title, author, Number(pages) || 300); return; }
    if (!isbn.trim()) return;
    const owner = currentWorkspaceOwner();
    setLookingUp(true);
    const metadata = await lookupOpenLibraryBook(isbn);
    if (!active.current || !workspaceAvailable() || currentWorkspaceOwner() !== owner) return;
    setLookingUp(false);
    if (!metadata?.title) { toast('This ISBN is not indexed yet — add the title and author manually'); return; }
    shelve(metadata.title, metadata.author ?? '', metadata.pages ?? 300);
  };
  const fillFromIsbn = async () => {
    const owner = currentWorkspaceOwner();
    setLookingUp(true);
    const metadata = await lookupOpenLibraryBook(isbn);
    if (!active.current || !workspaceAvailable() || currentWorkspaceOwner() !== owner) return;
    setLookingUp(false);
    if (!metadata) { toast('This ISBN is not indexed yet — add the title and author manually'); return; }
    if (metadata.title) setTitle(metadata.title);
    if (metadata.author) setAuthor(metadata.author);
    if (metadata.pages) setPages(String(metadata.pages));
    toast('Book details filled from ISBN');
  };
  return (
    <Modal open={open} onClose={onClose} title="Add a book">
      <div className="form">
        <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void submit()} /></Field>
        <Field label="Author"><input value={author} onChange={(e) => setAuthor(e.target.value)} /></Field>
        <Field label="ISBN — quick add (optional)"><div className="row" style={{ gap: 8 }}><input autoFocus value={isbn} onChange={(e) => setIsbn(e.target.value)} inputMode="numeric" placeholder="978…" /><Button size="sm" icon={Camera} onClick={() => setScanning(true)}>Scan</Button><Button size="sm" onClick={fillFromIsbn} disabled={!isbn.trim() || lookingUp}>{lookingUp ? 'Looking up…' : 'Look up'}</Button></div></Field>
        <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <Field label="Pages"><input type="number" min={1} value={pages} onChange={(e) => setPages(e.target.value)} /></Field>
          <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value as BookStatus)}>{(Object.keys(BOOK_STATUS) as BookStatus[]).map((s) => <option key={s} value={s}>{BOOK_STATUS[s]}</option>)}</select></Field>
          <Field label="Shelf"><select value={shelfId} onChange={(e) => setShelfId(e.target.value)}><option value="">None</option>{Object.values(shelves).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        </div>
        <div className="form-actions"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => void submit()} disabled={lookingUp || (!title.trim() && !isbn.trim())}>{lookingUp ? 'Looking up…' : !title.trim() && isbn.trim() ? 'Look up & add' : 'Add book'}</Button></div>
        {scanning && <BarcodeScanner onCode={(code) => { setIsbn(code); setScanning(false); toast(`Scanned ISBN ${code}`); }} onClose={() => setScanning(false)} />}
      </div>
    </Modal>
  );
}

function BarcodeScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [message, setMessage] = useState('Point the camera at the ISBN barcode.');
  useEffect(() => {
    type Detection = { rawValue?: string };
    type Detector = { detect(source: CanvasImageSource): Promise<Detection[]> };
    type DetectorConstructor = new (options: { formats: string[] }) => Detector;
    const Detector = (window as unknown as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) { setMessage('Barcode scanning is not supported in this browser. Enter the ISBN above.'); return; }
    let active = true, stream: MediaStream | undefined, timer = 0;
    const detector = new Detector({ formats: ['ean_13'] });
    void navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }).then(async (nextStream) => {
      stream = nextStream;
      if (!active || !video.current) { nextStream.getTracks().forEach((track) => track.stop()); return; }
      video.current.srcObject = nextStream;
      await video.current.play();
      const scan = async () => {
        if (!active || !video.current) return;
        try {
          const result = await detector.detect(video.current);
          const code = result[0]?.rawValue?.replace(/\D/g, '');
          if (code?.length === 13 && /^(978|979)/.test(code)) { onCode(code); return; }
        } catch { /* The video may not have a decodable frame yet. */ }
        timer = window.setTimeout(scan, 250);
      };
      void scan();
    }).catch(() => setMessage('Camera access was unavailable. Enter the ISBN above.'));
    return () => { active = false; window.clearTimeout(timer); stream?.getTracks().forEach((track) => track.stop()); };
  }, [onCode]);
  return <div className="barcode-scanner"><video ref={video} muted playsInline /><div className="barcode-target" /><span>{message}</span><Button size="sm" onClick={onClose}>Cancel scan</Button></div>;
}

/** Book detail — rendered inside the click-anchored Popover. */
function BookDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { books, shelves, updateBook, deleteBook, setStatus, logProgress } = useLibrary();
  const [page, setPage] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const book = books[id];
  if (!book) return null;
  const pct = book.pages ? Math.round((book.currentPage / book.pages) * 100) : 0;
  const log = () => { if (!page) return; const to = Number(page); logProgress(book.id, to); toast(to >= book.pages ? `Finished “${book.title}” 🎉` : `Page ${to} logged`); setPage(''); };
  const fillFromIsbn = async () => {
    if (!book.isbn) return;
    const owner = currentWorkspaceOwner();
    setLookingUp(true);
    const metadata = await lookupOpenLibraryBook(book.isbn);
    if (!active.current || !workspaceAvailable() || currentWorkspaceOwner() !== owner) return;
    setLookingUp(false);
    if (!metadata) { toast('This ISBN is not indexed yet — add the title and author manually'); return; }
    if (metadata.title) updateBook(book.id, { title: metadata.title });
    if (metadata.author) updateBook(book.id, { author: metadata.author });
    if (metadata.pages) updateBook(book.id, { pages: metadata.pages });
    toast('Book details filled from ISBN');
  };
  return (
    <div className="form" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
        <BookCover book={book} style={{ width: 64, flex: 'none' }}><div className="ctitle" style={{ fontSize: 9 }}>{book.title}</div></BookCover>
        <div className="grow stack" style={{ gap: 6 }}>
          <input value={book.title} onChange={(e) => updateBook(book.id, { title: e.target.value })} style={{ fontWeight: 600, fontSize: 15, padding: '6px 8px' }} aria-label="Title" />
          <input value={book.author} onChange={(e) => updateBook(book.id, { author: e.target.value })} aria-label="Author" style={{ padding: '6px 8px' }} />
          <div className="row" style={{ gap: 8 }}><input value={book.isbn ?? ''} onChange={(e) => updateBook(book.id, { isbn: e.target.value })} inputMode="numeric" aria-label="ISBN" placeholder="ISBN (optional)" style={{ padding: '6px 8px' }} /><Button size="sm" onClick={fillFromIsbn} disabled={!book.isbn?.trim() || lookingUp}>{lookingUp ? 'Looking up…' : 'Look up'}</Button></div>
        </div>
      </div>
      <div className="form-row">
        <Field label="Status"><select value={book.status} onChange={(e) => setStatus(book.id, e.target.value as BookStatus)}>{(Object.keys(BOOK_STATUS) as BookStatus[]).map((s) => <option key={s} value={s}>{BOOK_STATUS[s]}</option>)}</select></Field>
        <Field label="Shelf"><select value={book.shelfId ?? ''} onChange={(e) => updateBook(book.id, { shelfId: e.target.value || undefined })}><option value="">None</option>{Object.values(shelves).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <div className="between"><span className="muted" style={{ fontSize: 13 }}>Progress</span><span className="mono" style={{ fontSize: 13 }}>{book.currentPage} / {book.pages} · {pct}%</span></div>
        <Bar value={book.currentPage} max={book.pages} color="var(--library)" />
      </div>
      <div className="form-row" style={{ gridTemplateColumns: '1fr auto auto', alignItems: 'end' }}>
        <Field label="I'm on page"><input type="number" min={0} max={book.pages} value={page} onChange={(e) => setPage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && log()} placeholder={String(book.currentPage)} /></Field>
        <Button variant="primary" onClick={log}>Log</Button>
        <Button onClick={() => { setStatus(book.id, book.status === 'finished' ? 'want' : 'finished'); toast(book.status === 'finished' ? 'Back to Want to read' : 'Finished 🎉'); }}>{book.status === 'finished' ? 'Unfinish' : 'Finished'}</Button>
      </div>
      <div className="form-row">
        <Field label="Total pages"><input type="number" min={1} value={book.pages} onChange={(e) => updateBook(book.id, { pages: Number(e.target.value) || 1 })} /></Field>
        <Field label="Rating">
          <div className="row" style={{ gap: 4, height: 36 }}>
            {[1, 2, 3, 4, 5].map((r) => <button key={r} aria-label={`${r} stars`} onClick={() => updateBook(book.id, { rating: r as Book['rating'] })} style={{ color: (book.rating ?? 0) >= r ? 'var(--accent)' : 'var(--text-3)' }}><Star size={18} fill={(book.rating ?? 0) >= r ? 'currentColor' : 'none'} /></button>)}
          </div>
        </Field>
      </div>
      <p className="muted">Changes save automatically.</p><Field label="Notes & highlights"><textarea value={book.notes ?? ''} onChange={(e) => updateBook(book.id, { notes: e.target.value })} placeholder="Ideas worth keeping…" rows={3} /></Field>
      <div className="form-actions" style={{ marginTop: 0 }}>
        <Button variant="ghost" className="danger" size="sm" icon={Trash2} onClick={() => { deleteWithUndo(useLibrary, () => deleteBook(book.id), 'Book deleted'); onClose(); }}>Delete book</Button>
        <span className="grow" /><Button size="sm" variant="primary" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

function GoalForm({ onDone }: { onDone: () => void }) {
  const { goal, setGoal } = useLibrary();
  const [books, setBooks] = useState(String(goal.books)); const [ppd, setPpd] = useState(String(goal.pagesPerDay));
  return (
    <div className="form">
      <div className="form-row">
        <Field label="Books this year"><input type="number" min={1} value={books} onChange={(e) => setBooks(e.target.value)} /></Field>
        <Field label="Pages per day"><input type="number" min={1} value={ppd} onChange={(e) => setPpd(e.target.value)} /></Field>
      </div>
      <div className="form-actions"><Button variant="primary" onClick={() => { setGoal({ books: Number(books) || 1, pagesPerDay: Number(ppd) || 1 }); onDone(); }}>Save</Button></div>
    </div>
  );
}
