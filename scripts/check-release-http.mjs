import assert from 'node:assert/strict';

const base = new URL(process.argv[2] ?? 'http://127.0.0.1:8080');
const container = process.argv.includes('--container');
assert.ok(['http:', 'https:'].includes(base.protocol), 'Expected an HTTP(S) deployment URL');
async function get(path, status = 200) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, status, `${path}: status`);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', `${path}: nosniff`);
  assert.equal(response.headers.get('x-frame-options'), 'DENY', `${path}: frame protection`);
  const csp = response.headers.get('content-security-policy') ?? '';
  for (const rule of ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'"]) assert.ok(csp.includes(rule), `${path}: ${rule}`);
  const reportOnly = response.headers.get('content-security-policy-report-only') ?? '';
  for (const rule of ["default-src 'self'", "worker-src 'self' blob:", 'https://openlibrary.org']) assert.ok(reportOnly.includes(rule), `${path}: report-only ${rule}`);
  assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', `${path}: referrer policy`);
  assert.ok(response.headers.get('permissions-policy')?.includes('microphone=()'), `${path}: permissions policy`);
  return response;
}
const page = await get('/');
assert.ok(page.headers.get('content-type')?.includes('text/html'));
const html = await page.text();
const asset = html.match(/src="(\/assets\/[^"\s]+\.js)"/)?.[1];
assert.ok(asset, 'Built script asset present');
const script = await get(asset);
assert.ok((await script.text()).length > 100, 'Script has content');
assert.ok((await (await get('/tasks')).text()).includes('<div id="root">'), 'SPA deep link serves application');
if (container) {
  assert.equal(page.headers.get('cache-control'), 'no-cache');
  assert.ok(script.headers.get('cache-control')?.includes('immutable'));
  await get('/assets/release-check-missing.js', 404);
}
console.log(`Release HTTP checks passed for ${base.origin} (${container ? 'document, asset, deep link and error' : 'document, asset and deep link'}).`);
console.log('This verifies public responses, not authentication, live data isolation or CSP feature compatibility.');
