import { expect, test } from '@playwright/test';

test('help opens without GitHub access and links to local setup and recovery', async ({ page, context }) => {
  await context.route('https://github.com/**', (route) => route.abort());
  await page.goto('/settings');
  const newPage = context.waitForEvent('page');
  await page.getByRole('link', { name: 'Using Kaizen' }).click();
  const guide = await newPage;
  await expect(guide.getByRole('heading', { name: 'Using Kaizen', exact: true })).toBeVisible();
  await guide.getByRole('navigation').getByRole('link', { name: 'Local setup', exact: true }).click();
  await expect(guide.getByRole('heading', { level: 1 })).toContainText('local');
  await guide.getByRole('link', { name: 'data recovery', exact: true }).click();
  await expect(guide).toHaveURL(/using-kaizen\.html#my-workspace-looks-empty$/);
  await expect(guide.locator('#my-workspace-looks-empty')).toBeInViewport();
});
