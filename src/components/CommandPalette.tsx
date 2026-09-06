import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { modules } from '@/app/registry';
import { usePalette, useUI } from '@/app/uiStore';
import { parseQuickAdd } from '@/core/parse';
import { humanDate } from '@/core/dates';
import { Chip, DomainChip } from './ui';

interface Entry { id: string; group: string; label: string; hint?: string; icon: LucideIcon; run: () => void; preview?: boolean }

export function CommandPalette() {
  const { setLens, toggleTheme } = useUI();
  const { open: paletteOpen, setOpen: setPalette, toggle } = usePalette();
  const nav = useNavigate();
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
    const list: Entry[] = [];
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
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setIdx(0), [q]);
  if (!paletteOpen) return null;

  const active = entries[idx];
  const parsed = active?.preview ? parseQuickAdd(q.replace(/^add task:?\s*/i, '')) : null;
  const groups = [...new Set(entries.map((e) => e.group))];

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="palette" role="dialog" aria-label="Command palette">
        <div className="palette-input">
          <Search size={18} style={{ color: 'var(--text-3)' }} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a command, or just type a task…"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(entries.length - 1, i + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
              if (e.key === 'Enter' && active) active.run();
              if (e.key === 'Escape') close();
            }} />
          <span className="kbd">esc</span>
        </div>
        <div className="palette-list">
          {groups.map((g) => (
            <div key={g}>
              <div className="palette-group">{g}</div>
              {entries.filter((e) => e.group === g).map((e) => {
                const i = entries.indexOf(e);
                return (
                  <div key={e.id} className={`palette-item ${i === idx ? 'active' : ''}`} onMouseEnter={() => setIdx(i)} onClick={e.run}>
                    <e.icon /><span>{e.label}</span>{e.hint && <span className="hint">{e.hint}</span>}{i === idx && <CornerDownLeft size={14} style={{ color: 'var(--text-3)' }} />}
                  </div>
                );
              })}
            </div>
          ))}
          {!entries.length && <div className="empty" style={{ padding: 20 }}>No matches</div>}
        </div>
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
    </div>
  );
}
