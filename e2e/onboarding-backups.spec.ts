import { expect, test } from '@playwright/test';
import { readPersistedValue } from './persistence';

for (const width of [390, 1280]) {
  test(`first actions, chosen goals and backup reminders persist at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/library');
    await expect(page.getByText('Add your first book', { exact: true })).toBeVisible();
    await expect(page.getByText('Choose a reading goal', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark read', exact: true })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Backup reminder' })).toHaveCount(0);
    await page.getByRole('button', { name: /Edit .* reading goal/ }).click();
    const goal = page.getByRole('dialog', { name: /reading goal/ });
    await expect(goal.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
    await goal.getByLabel('Books this year').fill('12');
    await goal.getByLabel('Pages per day').fill('10');
    await goal.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('button', { name: 'Add book', exact: true }).click();
    const book = page.getByRole('dialog', { name: 'Add a book' });
    await book.getByLabel('Title', { exact: true }).fill('One useful book');
    await book.getByRole('button', { name: 'Add book', exact: true }).click();
    const reminder = page.getByRole('region', { name: 'Backup reminder' });
    await expect(reminder).toBeVisible();
    await expect(reminder).toContainText('Sync is not a backup');
    await reminder.getByRole('button', { name: 'Remind me in a week' }).click();
    await expect.poll(async () => JSON.parse(await readPersistedValue(page, 'ui') ?? '{}')).toMatchObject({ state: { backupReminderDismissedUntil: expect.any(String) } });
    await page.reload();
    await expect(reminder).toHaveCount(0);
    await expect(page.getByText('12 to go', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'One useful book', exact: true })).toBeVisible();
    await page.goto('/studio');
    await expect(page.getByText(/This is manual planning/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'New piece', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Add your first channel', exact: true }).click();
    const channel = page.getByRole('dialog', { name: 'Add channel' });
    await channel.getByLabel('Name', { exact: true }).fill('Weekly notes');
    await channel.getByRole('button', { name: 'Add channel', exact: true }).click();
    await expect(page.getByRole('button', { name: 'New piece', exact: true })).toBeVisible();
    await page.getByLabel('Capture idea', { exact: true }).fill('First article');
    await page.getByLabel('Capture idea', { exact: true }).press('Enter');
    await page.getByRole('button', { name: 'Pipeline', exact: true }).click();
    await expect(page.getByText(/First article/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto('/settings');
    await expect(page.getByText('Workspace reset', { exact: true })).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    expect((await download).suggestedFilename()).toMatch(/kaizen.*\.json/);
  });
}

test('phone and tablet Feed prioritizes content and keeps every area reachable', async ({ page }) => {
  await page.goto('/feed');
  await expect(page.getByRole('button', { name: 'Add source', exact: true })).toHaveClass(/primary/);
  await expect(page.getByRole('button', { name: 'Add episode / issue' })).toHaveCount(0);
  await page.evaluate(async () => {
    const { useFeed } = await import('/src/modules/feed/store.ts');
    const { whenHydrated } = await import('/src/core/store.ts');
    await whenHydrated(useFeed);
    const source = useFeed.getState().addSource({ name: 'Example podcast', kind: 'podcast' });
    useFeed.getState().addItem({ sourceId: source.id, title: 'An episode worth hearing' });
  });
  await page.getByRole('button', { name: 'Remind me in a week' }).click();
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    const item = page.getByText('An episode worth hearing', { exact: true });
    const summary = page.locator('summary').filter({ hasText: 'Activity summary' });
    expect((await item.boundingBox())!.y).toBeLessThan((await summary.boundingBox())!.y);
    await expect(page.locator('.feed-statistics')).not.toHaveAttribute('open', '');
    await summary.click();
    await expect(page.getByText('ideas captured', { exact: true })).toBeVisible();
    await summary.click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const nav = page.getByRole('navigation', { name: 'Primary (mobile)', exact: true });
  await expect(nav.getByRole('link')).toHaveCount(3);
  const more = nav.getByRole('button', { name: 'More', exact: true });
  const bounds = await more.boundingBox();
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
  await more.click();
  const areas = page.getByRole('dialog', { name: 'More areas' });
  const links = await areas.getByRole('link').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')));
  expect(links).toEqual(expect.arrayContaining(['/', '/tasks', '/library', '/feed', '/studio', '/health', '/settings']));
  await areas.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(areas).toHaveCount(0);
  await expect(page).toHaveURL(/\/settings$/);
});
