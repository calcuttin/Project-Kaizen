/** A small, bounded BASIC interpreter. User input is parsed, never evaluated as JavaScript. */
export type BasicValue = string | number;
export type BasicProgram = Record<number, string>;
export const DEMO: BasicProgram = { 10: 'FOR I = 1 TO 5', 20: 'PRINT "ONE SMALL STEP "; I', 30: 'NEXT I', 40: 'PRINT "WELCOME TO KAIZEN"' };

export function expression(source: string, vars: Record<string, BasicValue> = {}): BasicValue {
  const tokens: string[] = [];
  let rest = source.trim();
  while (rest) {
    const match = /^("(?:[^"]|"")*"|\d+(?:\.\d*)?|\.\d+|[A-Z][A-Z0-9]*\$?|[()+\-*/^])/i.exec(rest);
    if (!match) throw new Error('SYNTAX ERROR');
    tokens.push(match[0]); rest = rest.slice(match[0].length).trimStart();
  }
  let cursor = 0;
  const number = (v: BasicValue) => { if (typeof v !== 'number') throw new Error('TYPE MISMATCH'); return v; };
  function atom(): BasicValue {
    const t = tokens[cursor++];
    if (!t) throw new Error('SYNTAX ERROR');
    if (t === '-') return -number(atom());
    if (t === '+') return number(atom());
    if (t === '(') { const v = add(); if (tokens[cursor++] !== ')') throw new Error('SYNTAX ERROR'); return v; }
    if (t.startsWith('"')) return t.slice(1, -1).replaceAll('""', '"');
    if (/^\d|^\./.test(t)) return Number(t);
    if (/^[A-Z]/i.test(t)) return vars[t.toUpperCase()] ?? (t.endsWith('$') ? '' : 0);
    throw new Error('SYNTAX ERROR');
  }
  function power(): BasicValue { const a = atom(); if (tokens[cursor] !== '^') return a; cursor++; return number(a) ** number(power()); }
  function multiply(): BasicValue {
    let a = power();
    while (tokens[cursor] === '*' || tokens[cursor] === '/') {
      const op = tokens[cursor++], b = number(power());
      if (op === '/' && b === 0) throw new Error('DIVISION BY ZERO');
      a = op === '*' ? number(a) * b : number(a) / b;
    }
    return a;
  }
  function add(): BasicValue {
    let a = multiply();
    while (tokens[cursor] === '+' || tokens[cursor] === '-') {
      const op = tokens[cursor++], b = multiply();
      a = op === '+' && typeof a === 'string' && typeof b === 'string' ? a + b : op === '+' ? number(a) + number(b) : number(a) - number(b);
    }
    return a;
  }
  const value = add();
  if (cursor !== tokens.length) throw new Error('SYNTAX ERROR');
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('OVERFLOW');
  return value;
}

function printText(source: string, vars: Record<string, BasicValue>): string {
  if (!source.trim()) return '';
  // Split PRINT lists only outside strings and parentheses.
  const parts: string[] = []; let chunk = '', quoted = false, depth = 0;
  for (const c of source) {
    if (c === '"') quoted = !quoted;
    if (!quoted && c === '(') depth++;
    if (!quoted && c === ')') depth--;
    if (!quoted && depth === 0 && (c === ';' || c === ',')) { if (chunk.trim()) parts.push(String(expression(chunk, vars))); if (c === ',') parts.push('    '); chunk = ''; }
    else chunk += c;
  }
  if (chunk.trim()) parts.push(String(expression(chunk, vars)));
  return parts.join('');
}

export function runBasic(program: BasicProgram, initial: Record<string, BasicValue> = {}): { output: string[]; vars: Record<string, BasicValue> } {
  const lines = Object.entries(program).map(([n, code]) => [Number(n), code] as const).sort((a, b) => a[0] - b[0]);
  const output: string[] = [], vars = { ...initial };
  const loops: { variable: string; end: number; step: number; start: number }[] = [];
  let pc = 0, steps = 0;
  const jump = (line: number) => { const i = lines.findIndex(([n]) => n === line); if (i < 0) throw new Error('UNDEFINED LINE'); return i; };
  try {
    while (pc < lines.length) {
      if (++steps > 1000 || output.length > 300) throw new Error('EXECUTION LIMIT — PROGRAM STOPPED');
      const code = lines[pc][1].trim(); let m: RegExpMatchArray | null;
      if (!code || /^REM(?:\s|$)/i.test(code)) { pc++; continue; }
      if (/^(END|STOP)$/i.test(code)) break;
      if ((m = code.match(/^(?:PRINT\b|\?)(.*)$/i))) output.push(printText(m[1], vars));
      else if ((m = code.match(/^(?:LET\s+)?([A-Z][A-Z0-9]*\$?)\s*=\s*(.+)$/i))) {
        const key = m[1].toUpperCase(), value = expression(m[2], vars);
        if (key.endsWith('$') !== (typeof value === 'string')) throw new Error('TYPE MISMATCH');
        vars[key] = value;
      } else if ((m = code.match(/^GOTO\s+(\d+)$/i))) { pc = jump(Number(m[1])); continue; }
      else if ((m = code.match(/^IF\s+(.+?)\s*(<>|<=|>=|=|<|>)\s*(.+?)\s+THEN\s+(?:GOTO\s+)?(\d+)$/i))) {
        const a = expression(m[1], vars), b = expression(m[3], vars);
        const yes = m[2] === '=' ? a === b : m[2] === '<>' ? a !== b : m[2] === '<' ? a < b : m[2] === '>' ? a > b : m[2] === '<=' ? a <= b : a >= b;
        if (yes) { pc = jump(Number(m[4])); continue; }
      } else if ((m = code.match(/^FOR\s+([A-Z][A-Z0-9]*)\s*=\s*(.+?)\s+TO\s+(.+?)(?:\s+STEP\s+(.+))?$/i))) {
        const variable = m[1].toUpperCase();
        const start = expression(m[2], vars), end = expression(m[3], vars), step = expression(m[4] ?? '1', vars);
        if (typeof start !== 'number' || typeof end !== 'number' || typeof step !== 'number' || step === 0) throw new Error('ILLEGAL QUANTITY');
        vars[variable] = start;
        if (step > 0 ? start > end : start < end) {
          let nested = 1;
          while (nested && ++pc < lines.length) { if (/^FOR\s/i.test(lines[pc][1].trim())) nested++; if (/^NEXT(?:\s|$)/i.test(lines[pc][1].trim())) nested--; }
          if (nested) throw new Error('FOR WITHOUT NEXT');
        } else loops.push({ variable, end, step, start: pc });
      } else if ((m = code.match(/^NEXT(?:\s+([A-Z][A-Z0-9]*))?$/i))) {
        const loop = loops.at(-1);
        if (!loop || (m[1] && loop.variable !== m[1].toUpperCase())) throw new Error('NEXT WITHOUT FOR');
        const value = Number(vars[loop.variable]) + loop.step; vars[loop.variable] = value;
        if (loop.step > 0 ? value <= loop.end : value >= loop.end) { pc = loop.start + 1; continue; }
        loops.pop();
      } else throw new Error('SYNTAX ERROR');
      pc++;
    }
    if (loops.length && pc >= lines.length) throw new Error('FOR WITHOUT NEXT');
  } catch (error) { output.push(`?${error instanceof Error ? error.message : 'ERROR'}${lines[pc] ? ` IN ${lines[pc][0]}` : ''}`); }
  return { output, vars };
}
