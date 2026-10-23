import { expect, test, type Page } from '@playwright/test';

async function scannerFixture(page: Page, mode: 'pending' | 'play-failure' | 'unsupported') {
  await page.addInitScript((mode) => {
    const state = { requests: 0, stops: 0, resolve: (_: { rawValue: string }[]) => {} };
    Object.assign(window, { scannerFixture: state });
    Object.assign(window, { BarcodeDetector: class {
      constructor() { if (mode === 'unsupported') throw new Error('Unsupported format'); }
      detect() { return new Promise(resolve => { state.resolve = resolve; }); }
    } });
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      state.requests++;
      const stream = new MediaStream();
      Object.defineProperty(stream, 'getTracks', { value: () => [{ stop: () => state.stops++ }] });
      return stream;
    } });
    HTMLMediaElement.prototype.play = () => mode === 'play-failure' ? Promise.reject(new Error('Playback unavailable')) : Promise.resolve();
  }, mode);
  await page.goto('/library');
  await page.getByRole('button', { name: 'Add book', exact: true }).click();
  await page.getByRole('button', { name: 'Scan', exact: true }).click();
}
const stats = (page: Page) => page.evaluate(() => (window as unknown as { scannerFixture: { requests: number; stops: number } }).scannerFixture);

test('cancel ignores late barcode detection and parent edits do not restart the camera', async ({ page }) => {
  await scannerFixture(page, 'pending');
  // Development StrictMode may start and clean up an initial effect. Only one stream remains live.
  await expect.poll(async () => { const s = await stats(page); return s.requests - s.stops; }).toBe(1);
  const initial = await stats(page);
  const dialog = page.getByRole('dialog', { name: 'Add a book', exact: true });
  await dialog.getByRole('textbox', { name: 'Title', exact: true }).fill('Draft title');
  expect((await stats(page)).requests).toBe(initial.requests);
  await page.getByRole('button', { name: 'Cancel scan', exact: true }).click();
  await page.evaluate(() => (window as unknown as { scannerFixture: { resolve: (items: { rawValue: string }[]) => void } }).scannerFixture.resolve([{ rawValue: '9780141439518' }]));
  await expect(dialog.getByPlaceholder('978…')).toHaveValue('');
  await expect(dialog.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('Draft title');
  expect((await stats(page)).stops).toBe(initial.requests);
  await expect(page.getByText('Scanned ISBN 9780141439518', { exact: true })).toHaveCount(0);
});

for (const mode of ['play-failure', 'unsupported'] as const) test(`${mode} keeps manual ISBN entry usable`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await scannerFixture(page, mode);
  await expect(page.getByRole('status').filter({ hasText: mode === 'unsupported' ? 'not supported' : 'Camera access was unavailable' })).toBeVisible();
  await expect.poll(async () => { const s = await stats(page); return s.requests - s.stops; }).toBe(0);
  if (mode === 'play-failure') expect((await stats(page)).requests).toBeGreaterThan(0);
  else expect((await stats(page)).requests).toBe(0);
  await page.getByRole('button', { name: 'Cancel scan', exact: true }).click();
  await page.getByPlaceholder('978…').fill('9780141439518');
  await expect(page.getByPlaceholder('978…')).toHaveValue('9780141439518');
  expect(errors).toEqual([]);
});
