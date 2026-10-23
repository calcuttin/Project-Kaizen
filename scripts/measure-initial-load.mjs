/** Reproducible local device-mode production profile; run after pnpm build. */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { gzipSync } from 'node:zlib';
const root = resolve('dist');
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = resolve(root, `.${path === '/' ? '/index.html' : path}`);
  if (!file.startsWith(root + '/')) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    const compressed = gzipSync(body);
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'content-encoding': 'gzip', 'content-length': compressed.length, 'cache-control': 'no-store' }).end(compressed);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(5190, '127.0.0.1', resolve));
const browser = await chromium.launch();
const results = [];
try {
  for (let run = 0; run < 3; run++) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Performance.enable');
    await page.goto('http://127.0.0.1:5190/');
    await page.getByRole('textbox', { name: 'Quick add for today' }).waitFor();
    const timing = await page.evaluate(() => ({ readyMs: performance.now(), fcpMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime, scripts: performance.getEntriesByType('resource').filter(r => r.name.endsWith('.js')).map(r => ({ name: new URL(r.name).pathname, gzipBytes: r.encodedBodySize, decodedBytes: r.decodedBodySize })) }));
    const metrics = (await cdp.send('Performance.getMetrics')).metrics;
    results.push({ ...timing, scriptMs: metrics.find(m => m.name === 'ScriptDuration').value * 1000, taskMs: metrics.find(m => m.name === 'TaskDuration').value * 1000, jsGzipBytes: timing.scripts.reduce((sum, s) => sum + s.gzipBytes, 0) });
    await context.close();
  }
  console.log(JSON.stringify({ profile: 'Chromium, 390x844, cold cache, 4x CPU slowdown, 150ms latency, 1.6Mbps download; three runs; device mode; gzip server', results }, null, 2));
} finally { await browser.close(); server.close(); }
