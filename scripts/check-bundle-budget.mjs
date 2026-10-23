import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));
const visited = new Set();
function visit(key) {
  if (visited.has(key)) return;
  assert.ok(manifest[key], `Missing build entry ${key}`);
  visited.add(key);
  for (const dependency of manifest[key].imports ?? []) visit(dependency);
}
visit('index.html');
visit('src/modules/today/TodayPage.tsx');
const bytes = [...visited].reduce((sum, key) => sum + gzipSync(readFileSync(`dist/${manifest[key].file}`)).length, 0);
// Measured at 175,000 bytes on 2026-10-22: ~9% room for ordinary growth.
const budget = 190_000;
console.log(`Initial Today JavaScript: ${bytes.toLocaleString()} gzip bytes; budget ${budget.toLocaleString()}.`);
assert.ok(bytes <= budget, 'Initial route exceeded its measured JS budget; inspect eager imports before changing the limit.');
