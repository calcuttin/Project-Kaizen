import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { LibraryDialog } from './LibraryDialog';
import { DEMO, runBasic, type BasicProgram, type BasicValue } from './basic';
import { useLibrary } from './store';

const BOOT = ['APPLE II · KAIZEN EDITION', 'A SMALL BASIC PLAYGROUND', '', 'TYPE HELP FOR COMMANDS, OR RUN FOR A DEMO.', ''];
const HELP = ['PRINT "HELLO"      PRINT TEXT OR ARITHMETIC', 'LET X = 42         SET A VARIABLE', '10 PRINT "HELLO"   ADD A NUMBERED LINE', '10                 DELETE THAT LINE', 'LIST / RUN / NEW   VIEW, RUN, CLEAR PROGRAM', 'FOR I = 1 TO 5 / NEXT I', 'GOTO 10 / IF X > 2 THEN 30 / END', 'HOME               CLEAR SCREEN', 'BOOKS              BROWSE YOUR LIBRARY', 'HELP               THIS GUIDE'];

export function RetroTerminal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [program, setProgram] = useState<BasicProgram>({ ...DEMO });
  const [vars, setVars] = useState<Record<string, BasicValue>>({});
  const [lines, setLines] = useState(BOOT);
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const output = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const books = useLibrary((s) => s.books);
  useEffect(() => { if (open) { input.current?.focus(); if (output.current) output.current.scrollTop = output.current.scrollHeight; } }, [open, lines]);
  const execute = (source: string) => {
    const text = source.trim(); if (!text) return;
    const upper = text.toUpperCase();
    setCommand(''); setHistory((h) => [...h.slice(-49), text]); setHistoryIndex(-1);
    let response: string[] = [];
    const numbered = text.match(/^(\d+)\s*(.*)$/);
    if (numbered) {
      const n = Number(numbered[1]);
      if (n < 1 || n > 63999) response = ['?LINE NUMBER MUST BE 1–63999'];
      else setProgram((p) => { const next = { ...p }; if (numbered[2]) next[n] = numbered[2]; else delete next[n]; return next; });
    } else if (upper === 'HELP') response = HELP;
    else if (upper === 'HOME' || upper === 'CLEAR') { setLines([]); return; }
    else if (upper === 'NEW') { setProgram({}); setVars({}); response = ['PROGRAM CLEARED.']; }
    else if (upper === 'LIST') response = Object.entries(program).sort(([a], [b]) => Number(a) - Number(b)).map(([n, code]) => `${n} ${code}`);
    else if (upper === 'BOOKS' || upper === 'CATALOG') response = ['YOUR LIBRARY', ...Object.values(books).slice(0, 30).map((b, i) => `${String(i + 1).padStart(2, '0')}  ${b.title}`), `${Object.keys(books).length} BOOKS ON THE SHELVES.`];
    else {
      const result = runBasic(upper === 'RUN' ? program : { 1: text }, upper === 'RUN' ? {} : vars);
      setVars(result.vars); response = result.output;
      if (upper === 'RUN' && !Object.keys(program).length) response = ['NO PROGRAM. ADD A NUMBERED LINE FIRST.'];
    }
    setLines((old) => [...old, `] ${text}`, ...response].slice(-400));
  };
  const submit = (e: FormEvent) => { e.preventDefault(); execute(command); };
  return <LibraryDialog open={open} onClose={onClose} title="Apple II" className="terminal-dialog">
    <p className="terminal-intro">Pull up a chair. Write a little BASIC.</p>
    <div className="crt-terminal" onClick={() => input.current?.focus()}>
      <div ref={output} className="terminal-output" role="log" aria-label="Computer output" aria-live="polite">{lines.map((line, i) => <div key={i}>{line || '\u00a0'}</div>)}</div>
      <form onSubmit={submit} className="terminal-prompt"><span aria-hidden="true">]</span><input ref={input} value={command} onChange={(e) => setCommand(e.target.value)} aria-label="BASIC command" autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={500}
        onKeyDown={(e) => { if (e.key === 'ArrowUp' && history.length) { e.preventDefault(); const i = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1); setHistoryIndex(i); setCommand(history[i]); } if (e.key === 'ArrowDown' && historyIndex >= 0) { e.preventDefault(); const i = historyIndex + 1; setHistoryIndex(i < history.length ? i : -1); setCommand(history[i] ?? ''); } }} /><button type="submit" aria-label="Run command">Return ↵</button></form>
    </div>
    <div className="terminal-actions"><button className="btn sm" onClick={() => execute('RUN')}><Play size={14} />Run program</button><button className="btn sm" onClick={() => { setProgram({ ...DEMO }); setVars({}); setLines([...BOOT, 'DEMO LOADED. TYPE RUN.']); }}><RotateCcw size={14} />Load demo</button><button className="btn sm ghost" onClick={() => execute('HELP')}>Commands</button><span>Inspired by Apple II BASIC · a bounded playground, not a full emulator</span></div>
  </LibraryDialog>;
}
