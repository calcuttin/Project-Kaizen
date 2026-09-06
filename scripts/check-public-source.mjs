import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

// Report file paths and rule names only. Never print matched credentials or private records.
const rules = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['secret token', /\b(?:sk_(?:live|test)_[A-Za-z0-9]{16,}|sb_secret_[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16})\b/],
  ['JWT credential', /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/],
];
const findings = [];
function inspect(path, content) {
  if (/(^|\/)\.env(?:\.|$)/.test(path) && !path.endsWith('.env.example')) findings.push(`${path}: environment file`);
  if (path.startsWith('private-data/')) findings.push(`${path}: private archive`);
  for (const [name, pattern] of rules) if (pattern.test(content)) findings.push(`${path}: ${name}`);
  if (path === 'src/data/notion-reading-list.json') {
    try { if (JSON.parse(content).rows?.length) findings.push(`${path}: personal reading-list fixture`); } catch { findings.push(`${path}: invalid fixture`); }
  }
  if (path === 'src/data/bookshelf.ts' && /\btitle:\s*['"]/.test(content)) findings.push(`${path}: bundled book collection`);
  if (/^design\/library\/.*\.png$/.test(path)) findings.push(`${path}: design screenshot requires privacy review`);
}
if (process.argv.includes('--history')) {
  const objects = execFileSync('git', ['rev-list', '--objects', '--all'], { encoding: 'utf8' }).trim().split('\n');
  for (const entry of objects) {
    const split = entry.indexOf(' ');
    if (split < 0) continue;
    const oid = entry.slice(0, split), path = entry.slice(split + 1);
    if (execFileSync('git', ['cat-file', '-t', oid], { encoding: 'utf8' }).trim() !== 'blob') continue;
    inspect(path, execFileSync('git', ['cat-file', 'blob', oid], { maxBuffer: 32 * 1024 * 1024 }).toString('utf8'));
  }
} else {
  const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  for (const path of paths) if (existsSync(path)) inspect(path, readFileSync(path).toString('utf8'));
}
const unique = [...new Set(findings)];
if (unique.length) { console.error(unique.join('\n')); process.exitCode = 1; }
else console.log('Public-source checks passed. This targeted scan does not replace a complete secret/history review.');
