import { expect, test } from '@playwright/test';

test('Today preferences survive reload, and the checklist can be reopened', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Dismiss checklist' }).click();
  await page.getByRole('button', { name: 'Customize Today' }).click();
  const dialog = page.getByRole('dialog', { name: 'Customize Today' });
  await dialog.getByRole('checkbox', { name: 'Studio', exact: true }).uncheck();
  await dialog.getByRole('button', { name: 'Move Reading up' }).click();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Explore Studio' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Dismiss checklist' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Customize Today' }).click();
  await expect(dialog.getByRole('checkbox', { name: 'Studio', exact: true })).not.toBeChecked();
  await expect(dialog.getByRole('checkbox')).toHaveCount(7);
  const labels = await dialog.getByRole('checkbox').evaluateAll((nodes) => nodes.map((node) => node.parentElement?.textContent));
  expect(labels.indexOf('Reading')).toBeLessThan(labels.indexOf('Habits'));
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Show checklist on Today' }).click();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Dismiss checklist' })).toBeVisible();
});

test('mobile book forms, combined filters, autosave and undo work together', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/library');
  await page.getByRole('button', { name: 'Add book', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a book' });
  await dialog.getByRole('textbox', { name: 'Title', exact: true }).fill('A small improvement');
  await dialog.getByRole('textbox', { name: 'Author', exact: true }).fill('Test Author');
  await dialog.getByRole('combobox', { name: 'Status', exact: true }).selectOption('reading');
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await dialog.getByRole('button', { name: 'Add book', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search books' }).fill('Test Author');
  await page.getByRole('group', { name: 'Filter books by status' }).getByRole('button', { name: 'Reading 1' }).click();
  await page.getByRole('button', { name: 'A small improvement', exact: true }).click();
  const details = page.getByRole('dialog', { name: 'Book details' });
  await details.getByRole('textbox', { name: 'Notes & highlights' }).fill('Saved automatically');
  await details.getByRole('button', { name: 'Delete book' }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'A small improvement', exact: true }).click();
  await expect(details.getByRole('textbox', { name: 'Notes & highlights' })).toHaveValue('Saved automatically');
  await details.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await page.getByRole('searchbox', { name: 'Search books' }).fill('does not exist');
  await expect(page.getByText('No matching books')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByRole('button', { name: 'A small improvement', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('a transient cover failure can be retried without reloading the app', async ({ page }) => {
  let attempts = 0;
  await page.route('https://openlibrary.org/search.json?**', async (route) => {
    attempts++;
    await route.fulfill(attempts === 1 ? { status: 503, body: '' } : { status: 200, contentType: 'application/json', body: JSON.stringify({ docs: [{ title: 'Cover test', author_name: ['Test Author'], cover_i: 12345 }] }) });
  });
  await page.route('https://covers.openlibrary.org/**', (route) => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=', 'base64') }));
  await page.goto('/library');
  await page.getByRole('button', { name: 'Add book', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a book' });
  await dialog.getByRole('textbox', { name: 'Title', exact: true }).fill('Cover test');
  await dialog.getByRole('textbox', { name: 'Author', exact: true }).fill('Test Author');
  await dialog.getByRole('button', { name: 'Add book', exact: true }).click();
  expect(attempts).toBe(0);
  await page.getByRole('button', { name: 'Enable online covers' }).click();
  await expect.poll(() => attempts).toBe(1);
  await page.getByRole('button', { name: 'Retry covers' }).click();
  await expect(page.getByRole('img', { name: 'Cover of Cover test' })).toBeVisible();
  expect(attempts).toBe(2);
});
