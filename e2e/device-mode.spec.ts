import { expect, test } from '@playwright/test';

async function expectWorkspaceOpen(page: import('@playwright/test').Page) {
  await expect(page.getByRole('heading', { name: 'Welcome to Kaizen' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start empty' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Explore with sample data' })).toHaveCount(0);
}

test('device mode opens without authentication and imports a CSV locally', async ({ page }) => {
  await page.goto('/library');
  await expect(page.getByRole('heading', { name: 'Bookshelf' })).toBeVisible();
  await expect(page.getByText('Email me a sign-in link')).toHaveCount(0);
  await expectWorkspaceOpen(page);

  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'books.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Title,Author,ISBN13,Number of Pages,Shelf\nThe E2E Book,Test Author,9781234567890,240,Test Shelf'),
  });
  await expect(page.getByText('1 records')).toBeVisible();
  await page.getByRole('button', { name: 'Import 1' }).click();
  await expect(page.getByRole('button', { name: 'Undo import' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('button', { name: 'The E2E Book' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'The E2E Book' })).toBeVisible();
  await expectWorkspaceOpen(page);
});

test('backup export remains available in device mode', async ({ page }) => {
  await page.goto('/settings');
  await expectWorkspaceOpen(page);
  await expect(page.getByRole('button', { name: 'Load samples' })).toBeVisible();
  await expect(page.getByText('Device only', { exact: true })).toHaveCount(3);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  await expect(await download).toBeTruthy();
});

test('a JSON backup restores into the local library', async ({ page }) => {
  await page.goto('/settings');
  await expectWorkspaceOpen(page);
  const now = new Date().toISOString();
  const backup = { app: 'kaizen', stores: { library: { shelves: {}, books: { restored: { id: 'restored', createdAt: now, updatedAt: now, title: 'Restored Book', author: 'Backup Author', pages: 200, currentPage: 0, status: 'want', tags: [], hue: 42 } }, sessions: [], annotations: {}, goal: { year: 2026, books: 12, pagesPerDay: 10 }, importedCollections: [], atmosphere: true } } };
  await page.locator('input[type=file]').setInputFiles({ name: 'kaizen-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.getByRole('dialog', { name: 'Review backup restore' })).toBeVisible();
  await page.getByRole('button', { name: 'Restore backup', exact: true }).click();
  await expect(page.getByText('Backup restored')).toBeVisible();
  await page.goto('/library');
  await expect(page.getByRole('button', { name: 'Restored Book' })).toBeVisible();
});

test('Kindle clippings create a reviewable book and annotation import', async ({ page }) => {
  await page.goto('/library');
  await expectWorkspaceOpen(page);
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await page.getByRole('button', { name: 'Kindle clippings' }).click();
  const clipping = 'A Kindle Book (Kindle Author)\n- Your Highlight on page 9 | Location 100-102 | Added on Monday, January 1, 2024 1:00:00 PM\n\nA memorable passage.\n==========';
  await page.locator('input[type=file]').setInputFiles({ name: 'My Clippings.txt', mimeType: 'text/plain', buffer: Buffer.from(clipping) });
  await expect(page.getByText('Review unmatched books')).toBeVisible();
  await expect(page.getByRole('option', { name: 'Create on Kindle shelf' })).toBeAttached();
  await page.getByRole('button', { name: 'Import 1' }).click();
  await expect(page.getByRole('button', { name: 'Undo import' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('button', { name: 'A Kindle Book' })).toBeVisible();
});

test('the installable app manifest is served', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.ok()).toBeTruthy();
  expect((await response.json()).display).toBe('standalone');
});
