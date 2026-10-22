import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, FileText, Highlighter, RotateCcw, Upload } from 'lucide-react';
import { BookMatchIndex, normalizeBookText } from '@kaizen/importers';
import { Button, Field, Modal, Segmented } from '@/components/ui';
import { toast } from '@/components/Toast';
import { themeForShelfName } from './themes';
import { useLibrary, type Book } from './store';
import { useImports, type ImportRun } from '@/core/imports/store';

import { MAX_IMPORT_BYTES, type ImportKind as Kind, type ImportPreview as Preview } from './importPreview';
import { currentWorkspaceOwner, onWorkspaceChange, workspaceAvailable } from '@/core/storage';

const normalized = normalizeBookText;


export function ImportCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [kind, setKind] = useState<Kind>('csv');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [fileName, setFileName] = useState('');
  const [kindleChoices, setKindleChoices] = useState<Record<string, string>>({});
  const [lastRun, setLastRun] = useState<ImportRun | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const worker = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const previewOwner = useRef<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cancel = () => { requestId.current++; worker.current?.terminate(); worker.current = null; setBusy(false); };
  const close = () => { cancel(); setPreview(null); onClose(); };
  useEffect(() => { if (!open) { cancel(); setPreview(null); } }, [open]);
  useEffect(() => onWorkspaceChange(() => { cancel(); setPreview(null); }), []);
  useEffect(() => () => { requestId.current++; worker.current?.terminate(); }, []);
  const library = useLibrary();
  const record = useImports((state) => state.record);
  const markUndone = useImports((state) => state.markUndone);
  const existing = useMemo(() => Object.values(library.books), [library.books]);

  const existingIndex = useMemo(() => new BookMatchIndex(existing), [existing]);
  const choose = async (file: File) => {
    cancel(); setPreview(null); setError(''); setLastRun(null); setFileName(file.name);
    if (file.size > MAX_IMPORT_BYTES) { setError('Choose a file smaller than 5 MB.'); return; }
    const generation = requestId.current;
    previewOwner.current = currentWorkspaceOwner();
    setBusy(true);
    try {
      const text = await file.text();
      if (generation !== requestId.current) return;
      const parser = new Worker(new URL('./import.worker.ts', import.meta.url), { type: 'module' });
      worker.current = parser;
      parser.onmessage = (event: MessageEvent<{ preview?: Preview; error?: string }>) => {
        if (generation !== requestId.current) return;
        parser.terminate(); worker.current = null; setBusy(false);
        if (event.data.error) { setError(event.data.error); return; }
        const next = event.data.preview;
        if (!next) { setError('Unable to read this file.'); return; }
        if (next.kind === 'kindle') setKindleChoices(Object.fromEntries(next.data.books.map((book) => [`${normalized(book.title)}|${normalized(book.author)}`, 'create'])));
        setPreview(next);
      };
      parser.onerror = () => { if (generation === requestId.current) { cancel(); setError('Unable to read this file. Try a smaller export.'); } };
      parser.postMessage({ kind, text });
    } catch { if (generation === requestId.current) { setBusy(false); setError('Unable to read this file. Please choose it again.'); } }
  };
  const changeKind = (next: Kind) => { cancel(); setKind(next); setPreview(null); setFileName(''); setLastRun(null); setError(''); };
  const ensureShelf = (name: string, createdShelfIds: string[]) => {
    const existingShelf = Object.values(useLibrary.getState().shelves).find((shelf) => normalized(shelf.name) === normalized(name));
    if (existingShelf) return existingShelf;
    const shelf = useLibrary.getState().addShelf(name, themeForShelfName(name));
    createdShelfIds.push(shelf.id);
    return shelf;
  };

  const commit = () => {
    if (!preview || busy) return;
    if (!workspaceAvailable() || previewOwner.current !== currentWorkspaceOwner()) { setError('Workspace changed. Choose the file again.'); return; }
    const matchIndex = new BookMatchIndex(Object.values(useLibrary.getState().books));
    const createdBookIds: string[] = [], createdAnnotationIds: string[] = [], createdShelfIds: string[] = [];
    let skipped = 0, warningCount = preview.data.warnings.length;
    if (preview.kind === 'csv') {
      for (const item of preview.data.books) {
        if (matchIndex.find(item)) { skipped++; continue; }
        const shelf = item.shelf ? ensureShelf(item.shelf, createdShelfIds) : undefined;
        const book = useLibrary.getState().addBook({ ...item, shelfId: shelf?.id, pages: item.pages ?? 300, source: 'csv', sourceRef: item.isbn ?? `${normalized(item.title)}:${normalized(item.author)}` });
        matchIndex.add(book); createdBookIds.push(book.id);
      }
    } else {
      const bookMap = new Map<string, Book>();
      for (const summary of preview.data.books) {
        const key = `${normalized(summary.title)}|${normalized(summary.author)}`;
        let book = matchIndex.find(summary);
        const choice = kindleChoices[key] ?? 'create';
        if (!book && choice.startsWith('link:')) book = useLibrary.getState().books[choice.slice(5)];
        if (!book && choice === 'create') {
          const kindleShelf = ensureShelf('Kindle', createdShelfIds);
          book = useLibrary.getState().addBook({ title: summary.title, author: summary.author, shelfId: kindleShelf.id, source: 'kindle-clippings', sourceRef: `${normalized(summary.title)}:${normalized(summary.author)}` });
          matchIndex.add(book); createdBookIds.push(book.id);
        }
        if (book) bookMap.set(key, book); else skipped += summary.count;
      }
      const refs = new Set(Object.values(useLibrary.getState().annotations).map((item) => item.sourceRef));
      for (const clipping of preview.data.clippings) {
        const book = bookMap.get(`${normalized(clipping.title)}|${normalized(clipping.author)}`);
        if (!book || refs.has(clipping.sourceRef)) { skipped++; continue; }
        const annotation = useLibrary.getState().addAnnotation({ bookId: book.id, kind: clipping.kind, content: clipping.content, location: clipping.location, page: clipping.page, annotatedAt: clipping.annotatedAt, source: 'kindle-clippings', sourceRef: clipping.sourceRef });
        refs.add(clipping.sourceRef); createdAnnotationIds.push(annotation.id);
      }
    }
    const run = record({ adapter: preview.kind, fileName, created: createdBookIds.length + createdAnnotationIds.length, skipped, warningCount, createdBookIds, createdAnnotationIds, createdShelfIds });
    setLastRun(run);
    toast(`Imported ${run.created} item${run.created === 1 ? '' : 's'}${skipped ? ` · ${skipped} skipped` : ''}`);
  };

  const undo = () => {
    if (!lastRun || lastRun.undoneAt) return;
    for (const id of lastRun.createdAnnotationIds) useLibrary.getState().deleteAnnotation(id);
    for (const id of lastRun.createdBookIds) useLibrary.getState().deleteBook(id);
    for (const id of lastRun.createdShelfIds ?? []) useLibrary.getState().deleteShelf(id);
    markUndone(lastRun.id); setLastRun({ ...lastRun, undoneAt: new Date().toISOString() });
    toast('Import undone');
  };

  const total = preview?.kind === 'csv' ? preview.data.books.length : preview?.kind === 'kindle' ? preview.data.clippings.length : 0;
  const duplicates = preview?.kind === 'csv' ? preview.data.books.filter((item) => Boolean(existingIndex.find(item))).length : 0;
  const matchedBooks = preview?.kind === 'kindle' ? preview.data.books.filter((item) => Boolean(existingIndex.find(item))).length : 0;

  return <Modal open={open} onClose={close} title="Import books & annotations">
    <div className="import-center">
      <p className="muted import-intro">Preview everything before it changes your library. Files are parsed on this device.</p>
      <Segmented value={kind} onChange={changeKind} options={[{ value: 'csv', label: 'Books CSV', icon: FileText }, { value: 'kindle', label: 'Kindle clippings', icon: Highlighter }]} />
      <button className="import-drop" onClick={() => input.current?.click()}>
        <Upload size={24} /><strong>{fileName || (kind === 'csv' ? 'Choose a CSV export' : 'Choose My Clippings.txt')}</strong><span>{kind === 'csv' ? 'Kaizen, Goodreads, or a simple title/author CSV' : 'Highlights, notes, and bookmarks from a Kindle device'}</span>
      </button>
      <input ref={input} hidden type="file" accept={kind === 'csv' ? '.csv,text/csv' : '.txt,text/plain'} onChange={(event) => { const file = event.target.files?.[0]; if (file) void choose(file); event.currentTarget.value = ''; }} />
      <p className="muted">Up to 5 MB and 1,000 records per import.</p>
      {busy && <div role="status">Reading file… <Button onClick={cancel}>Cancel import</Button></div>}
      {error && <p role="alert">{error}</p>}
      {preview && <div className="import-preview">
        <div className="import-stats"><span><b>{total}</b> records</span>{preview.kind === 'csv' ? <span><b>{duplicates}</b> duplicates</span> : <><span><b>{preview.data.books.length}</b> books</span><span><b>{matchedBooks}</b> matched</span></>}</div>
        {preview.kind === 'kindle' && matchedBooks < preview.data.books.length && <Field label="Review unmatched books"><div className="import-decisions">{preview.data.books.filter((item) => !Boolean(existingIndex.find(item))).map((item) => { const key = `${normalized(item.title)}|${normalized(item.author)}`; return <label key={key}><span><strong>{item.title}</strong><small>{item.author || 'Unknown author'}</small></span><select value={kindleChoices[key] ?? 'create'} onChange={(event) => setKindleChoices((choices) => ({ ...choices, [key]: event.target.value }))}><option value="create">Create on Kindle shelf</option><option value="skip">Skip this book</option><optgroup label="Link to an existing book">{existing.map((book) => <option key={book.id} value={`link:${book.id}`}>{book.title} — {book.author}</option>)}</optgroup></select></label>; })}</div></Field>}
        <div className="import-list">{(preview.kind === 'csv' ? preview.data.books.slice(0, 8).map((item) => ({ title: item.title, detail: `${item.author || 'Unknown author'}${item.shelf ? ` · ${item.shelf}` : ''}` })) : preview.data.books.slice(0, 8).map((item) => ({ title: item.title, detail: `${item.author || 'Unknown author'} · ${item.count} clipping${item.count === 1 ? '' : 's'}` }))).map((item) => <div key={`${item.title}-${item.detail}`}><Check size={14} /><span><strong>{item.title}</strong><small>{item.detail}</small></span></div>)}</div>
        {preview.data.warnings.length > 0 && <div className="import-warning"><AlertTriangle size={15} />{preview.data.warnings.length} parsing warning{preview.data.warnings.length === 1 ? '' : 's'}</div>}
      </div>}
      <div className="form-actions"><Button variant="ghost" onClick={close}>Close</Button>{lastRun && !lastRun.undoneAt ? <Button icon={RotateCcw} onClick={undo}>Undo import</Button> : <Button variant="primary" onClick={commit} disabled={busy || !preview || total === 0}>Import {total || ''}</Button>}</div>
    </div>
  </Modal>;
}
