/** Disposable local Supabase database only: verify deletion waits, then blocks late writes. */
import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const status = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
const url = status.DB_URL;
assert.ok(url && ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname), 'Only local disposable Supabase databases are allowed');
const id = `deletion-test-${randomUUID()}`;
const sql = query => execFileSync('psql', [url, '-X', '-v', 'ON_ERROR_STOP=1', '-Atc', query], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const children = [];
function session(query, name, keepOpen = false) {
  const child = spawn('psql', [url, '-X', '-v', 'ON_ERROR_STOP=1', '-qAt'], { env: { ...process.env, PGAPPNAME: name }, stdio: ['pipe', 'pipe', 'pipe'] });
  children.push(child);
  const state = { child, output: '', error: '', done: null };
  child.stdout.on('data', data => { state.output += data; });
  child.stderr.on('data', data => { state.error += data; });
  state.done = new Promise(resolve => { child.on('error', () => resolve(-1)); child.on('close', resolve); });
  if (keepOpen) child.stdin.write(query + '\n'); else child.stdin.end(query + '\n');
  return state;
}
async function until(predicate, message) {
  const end = Date.now() + 10000;
  while (!predicate()) { assert.ok(Date.now() < end, message); await new Promise(resolve => setTimeout(resolve, 50)); }
}
const auth = `set role authenticated; select set_config('request.jwt.claims','{"sub":"${id}"}',false);`;
const waiting = name => sql(`select count(*) from pg_stat_activity where application_name='${name}' and wait_event='advisory'`) === '1';
const timeout = setTimeout(() => children.forEach(c => c.kill('SIGKILL')), 30000);
try {
  const writer = session(`begin; ${auth} insert into public.tasks(owner_id,id) values('${id}','before'); select 'write-ready';`, `${id}-writer`, true);
  await until(() => writer.output.includes('write-ready'), 'Initial writer did not start');
  const fence = session(`set role service_role; select public.begin_account_deletion('${id}');`, `${id}-fence`);
  await until(() => waiting(`${id}-fence`), 'Deletion did not wait for the in-flight writer');
  const late = session(`${auth} insert into public.tasks(owner_id,id) values('${id}','late');`, `${id}-late`);
  await until(() => waiting(`${id}-late`), 'Late writer did not wait behind deletion');
  writer.child.stdin.end('commit;\n');
  assert.equal(await writer.done, 0, 'Initial write failed');
  assert.equal(await fence.done, 0, 'Deletion fence failed');
  assert.notEqual(await late.done, 0, 'Late writer incorrectly succeeded');
  assert.ok(late.error.includes('account deletion is in progress'), 'Late writer failed for an unexpected reason');
  assert.equal(sql(`select count(*) from public.tasks where owner_id='${id}' and id='before'`), '1');
  assert.equal(sql(`select count(*) from public.tasks where owner_id='${id}' and id='late'`), '0');
  console.log('PASS: deletion waited for an active transaction; a queued write with an older statement snapshot was rejected.');
} finally {
  clearTimeout(timeout);
  for (const child of children) { if (child.exitCode === null) child.kill('SIGKILL'); }
  sql(`delete from public.tasks where owner_id='${id}'; delete from kaizen_private.account_deletions where owner_id='${id}';`);
}
