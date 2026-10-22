import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { modules } from '@/app/registry';
import { usePalette, useUI } from '@/app/uiStore';
import { parseQuickAdd } from '@/core/parse';
import { humanDate } from '@/core/dates';
import { useTasks } from '@/modules/tasks/store';
import { useLibrary } from '@/modules/library/store';
import { useFeed } from '@/modules/feed/store';
import { useStudio } from '@/modules/studio/store';
import { searchRecords } from '@/core/search';
import { Modal, Chip, DomainChip } from './ui';

interface Entry { id: string; group: string; label: string; hint?: string; icon: LucideIcon; run: () => void; preview?: boolean }

export function CommandPalette() {
  const { setLens, toggleTheme } = useUI();
  const { open: paletteOpen, setOpen: setPalette, toggle } = usePalette();
  const nav = useNavigate();
  const tasks = useTasks((s) => s.tasks);
  const books = useLibrary((s) => s.books);
  const items = useFeed((s) => s.items);
  const pieces = useStudio((s) => s.pieces);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); toggle(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  useEffect(() => { if (paletteOpen) { setQ(''); setIdx(0); setTimeout(() => inputRef.current?.focus(), 10); } }, [paletteOpen]);

  const close = () => setPalette(false);
  const go = (path: string) => { nav(path); close(); };

  const entries = useMemo<Entry[]>(() => {
    const query = q.trim().toLowerCase();
    const list: Entry[] = searchRecords(q, [
      ...Object.values(tasks).map((t) => ({ id: t.id, title: t.title, detail: t.notes, area: 'Tasks', path: '/tasks' })),
      ...Object.values(books).map((b) => ({ id: b.id, title: b.title, detail: b.author, area: 'Library', path: '/library' })),
      ...Object.values(items).map((i) => ({ id: i.id, title: i.title, detail: i.takeaway, area: 'Feed', path: '/feed' })),
      ...Object.values(pieces).map((p) => ({ id: p.id, title: p.title, area: 'Studio', path: '/studio' })),
    ]).map((record) => ({ id: `${record.path}:${record.id}`, group: 'Saved records', label: record.title, hint: record.area, icon: Search, run: () => { setLens('all'); go(`${record.path}?record=${encodeURIComponent(record.id)}`); } }));
    // Input-accepting actions: always offer them with the current text as payload.
    for (const m of modules) for (const a of m.quickActions ?? []) {
      if (a.acceptsInput && query) {
        const stripped = q.replace(new RegExp(`^${a.label}:?\\s*`, 'i'), '');
        list.push({ id: `${a.id}:input`, group: 'Create', label: `${a.label}: “${stripped}”`, hint: a.hint, icon: a.icon, preview: true, run: () => { a.run(stripped, go); close(); } });
      } else if (!a.acceptsInput && (!query || a.label.toLowerCase().includes(query) || a.keywords?.some((k) => k.includes(query)))) {
        list.push({ id: a.id, group: 'Actions', label: a.label, hint: a.hint, icon: a.icon, run: () => { a.run('', go); close(); } });
      }
    }
    for (const m of modules) {
      if (!query || m.name.toLowerCase().includes(query) || m.tagline.toLowerCase().includes(query)) {
        list.push({ id: `nav:${m.id}`, group: 'Go to', label: m.name, hint: m.tagline, icon: m.icon, run: () => go(m.path) });
      }
    }
    const lensOpts: { l: 'all' | 'personal' | 'business'; label: string }[] = [{ l: 'all', label: 'Lens: Everything' }, { l: 'personal', label: 'Lens: Personal' }, { l: 'business', label: 'Lens: Business' }];
    for (const o of lensOpts) if (!query || o.label.toLowerCase().includes(query) || 'lens filter'.includes(query)) list.push({ id: `lens:${o.l}`, group: 'View', label: o.label, icon: Search, run: () => { setLens(o.l); close(); } });
    if (!query || 'toggle theme dark light'.includes(query)) list.push({ id: 'theme', group: 'View', label: 'Toggle theme', icon: Search, run: () => { toggleTheme(); close(); } });
    return list;
  }, [q, tasks, books, items, pieces]);

  useEffect(() => setIdx(0), [q]);
  useEffect(() => { if (paletteOpen) document.getElementById(`palette-option-${idx}`)?.scrollIntoView({ block: 'nearest' }); }, [idx, paletteOpen]);


  const active = entries[idx];
  const parsed = active?.preview ? parseQuickAdd(q.replace(/^add task:?\s*/i, '')) : null;
  const groups = [...new Set(entries.map((e) => e.group))];

  return (
    <Modal open={paletteOpen} onClose={close} title="Command palette">
      <div className="palette" style={{ width: '100%', border: 0, boxShadow: 'none' }}>
        <div className="palette-input">
          <Search size={18} style={{ color: 'var(--text-3)' }} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your records, or add a task…" role="combobox" aria-label="Search records and commands" aria-expanded={true} aria-controls="palette-results" aria-autocomplete="list" aria-activedescendant={active ? `palette-option-${idx}` : undefined}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(entries.length - 1, i + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
              if (e.key === 'Enter' && active) active.run();
              if (e.key === 'Escape') close();
            }} />
          <span className="kbd">esc</span>
        </div>
        <div className="palette-list" id="palette-results" role="listbox" aria-label="Search results">
          {groups.map((g) => (
            <div key={g} role="group" aria-label={g}>
              <div className="palette-group">{g}</div>
              {entries.filter((e) => e.group === g).map((e) => {
                const i = entries.indexOf(e);
                return (
                  <div key={e.id} id={`palette-option-${i}`} role="option" aria-selected={i === idx} className={`palette-item ${i === idx ? 'active' : ''}`} onMouseEnter={() => setIdx(i)} onClick={e.run}>
                    <e.icon /><span>{e.label}</span>{e.hint && <span className="hint">{e.hint}</span>}{i === idx && <CornerDownLeft size={14} style={{ color: 'var(--text-3)' }} />}
                  </div>
                );
              })}
            </div>
          ))}
          {!entries.length && <div className="empty" style={{ padding: 20 }}>No matches</div>}
        </div>
        {parsed?.warning && <p role="status">{parsed.warning}</p>}
        {parsed && parsed.title && (
          <div className="palette-preview">
            <span>Creates task</span><b style={{ color: 'var(--text)' }}>{parsed.title}</b>
            <DomainChip domain={parsed.domain ?? 'personal'} />
            {parsed.project && <Chip>#{parsed.project}</Chip>}
            {parsed.priority ? <Chip tone={parsed.priority === 3 ? 'danger' : undefined}>P{4 - parsed.priority}</Chip> : null}
            {parsed.due && <Chip>{humanDate(parsed.due)}</Chip>}
          </div>
        )}
      </div>
    </Modal>
  );
}
